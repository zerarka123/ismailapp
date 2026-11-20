// Lighter videos before upload: a phone video (often 15–20 Mbit/s) is re-recorded on the phone at 720p and about
// 2.5 Mbit/s, which still looks sharp on a phone screen and is usually 4–6 times smaller.
// Only where the browser can record MP4 (recent Chrome / Android WebView). Anywhere else, or on any problem,
// the original file is kept: compression can never block a post.
// Must be started from the file picker's onChange (user gesture), because the sound goes through Web Audio.

const MIN_BYTES = 8 * 1024 * 1024; // smaller files are already light: keep them as they are
const MAX_SIDE = 1280; // 720p for a landscape video, 720×1280 for a portrait one
const VIDEO_BPS = 2_500_000;
const AUDIO_BPS = 128_000;
const MP4_TYPES = ['video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'];

export function canCompressVideo() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return false;
  if (!HTMLCanvasElement.prototype.captureStream) return false;
  return MP4_TYPES.some((t) => MediaRecorder.isTypeSupported(t));
}

// onProgress(0..1). Resolves to a File (compressed, or the original).
export function compressVideo(file, onProgress = () => {}, maxSeconds = Infinity) {
  if (!file || file.size < MIN_BYTES || !canCompressVideo()) return Promise.resolve(file);
  const mime = MP4_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const AC = window.AudioContext || window.webkitAudioContext;
  // created now, inside the user gesture, so it is allowed to run
  const audioCtx = AC ? new AC() : null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    let rec = null;
    let timer = null;
    const chunks = [];

    const finish = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        v.pause();
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(url);
      if (audioCtx) audioCtx.close().catch(() => {});
      resolve(result && result.size > 0 && result.size < file.size ? result : file);
    };

    v.src = url;
    v.playsInline = true;
    v.preload = 'auto';
    v.onerror = () => finish(null);

    v.onloadedmetadata = async () => {
      // too long for the post anyway: do not spend the time, the form rejects it
      if (Number.isFinite(v.duration) && v.duration > maxSeconds + 1) return finish(null);
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth || MAX_SIDE, v.videoHeight || MAX_SIDE));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(2, Math.round(((v.videoWidth || 1280) * scale) / 2) * 2);
        canvas.height = Math.max(2, Math.round(((v.videoHeight || 720) * scale) / 2) * 2);
        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(30);

        // the sound goes to the recorder only (not to the speaker)
        if (audioCtx) {
          const dest = audioCtx.createMediaStreamDestination();
          audioCtx.createMediaElementSource(v).connect(dest);
          dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
        } else {
          v.muted = true;
        }

        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BPS, audioBitsPerSecond: AUDIO_BPS });
        rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/mp4' });
          const name = file.name.replace(/\.[^.]+$/, '') + '.mp4';
          finish(new File([blob], name, { type: 'video/mp4' }));
        };
        rec.onerror = () => finish(null);

        const draw = () => {
          if (done || v.ended) return;
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          if (v.duration) onProgress(Math.min(0.99, v.currentTime / v.duration));
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw);
          else requestAnimationFrame(draw);
        };
        v.onended = () => {
          onProgress(1);
          if (rec && rec.state !== 'inactive') rec.stop();
        };

        // safety net: a video that stalls is not waited for forever
        timer = setTimeout(() => {
          if (rec && rec.state !== 'inactive') rec.stop();
          finish(null);
        }, ((v.duration || 40) + 20) * 1000);

        if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
        await v.play();
        rec.start(1000);
        draw();
      } catch {
        finish(null); // autoplay refused, recorder unavailable…: keep the original
      }
    };
  });
}

const AD_TYPES = ['video/mp4', 'video/quicktime'];
export const MAX_AD_VIDEO_BYTES = 50 * 1024 * 1024; // after compression (same limit as before)
const MAX_PICK_BYTES = 300 * 1024 * 1024; // a big phone video is accepted when it can be made lighter

// Video of an ad (Sell, FishPost): checks it, makes it lighter, then checks the final size.
// Resolves to { file } or { error: message key }.
export async function prepareAdVideo(file, onProgress, maxSeconds = 40) {
  if (!AD_TYPES.includes(file.type)) return { error: 'pf.video_type' };
  if (file.size > (canCompressVideo() ? MAX_PICK_BYTES : MAX_AD_VIDEO_BYTES)) return { error: 'pf.video_too_big' };
  const out = await compressVideo(file, onProgress, maxSeconds);
  if (out.size > MAX_AD_VIDEO_BYTES) return { error: 'pf.video_too_big' };
  return { file: out };
}
