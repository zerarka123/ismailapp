import { supabase, SUPABASE_URL } from '../supabase';
import { MAX_IMAGE_BYTES, MEDIA_BASE } from '../config';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
export const cssUrl = (u) => `url("${String(u).replace(/"/g, '%22')}")`;
// Rewrites a public Supabase Storage URL to the cached Cloudflare address (when VITE_MEDIA_BASE is set)
const STORAGE_MARK = '/storage/v1/object/public/';
export function viaCdn(url) {
  if (!MEDIA_BASE || typeof url !== 'string') return url;
  const i = url.indexOf(STORAGE_MARK);
  return i >= 0 && url.startsWith(SUPABASE_URL) ? `${MEDIA_BASE}/${url.slice(i + STORAGE_MARK.length)}` : url;
}
export const publicUrl = (bucket, path) => viaCdn(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);

// Validate, downscale (max 1600px, same sharpness as before) and re-encode: WebP when the phone can make it
// (about 30% lighter than JPEG at the same visible quality), JPEG otherwise. No metadata (GPS) leaks.
const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;

function toBlob(canvas, type, quality) {
  return new Promise((res) => canvas.toBlob(res, type, quality));
}

async function drawScaled(source, maxSide) {
  const bmp = await createImageBitmap(source).catch(() => null);
  if (!bmp) throw new Error('bad_image');
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return c;
}

export async function prepareImage(file) {
  if (!ALLOWED.includes(file.type)) throw new Error('bad_type');
  const c = await drawScaled(file, MAX_SIDE);
  // a browser that cannot encode WebP silently returns PNG: then use JPEG
  let blob = await toBlob(c, 'image/webp', WEBP_QUALITY);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(c, 'image/jpeg', JPEG_QUALITY);
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error('too_big');
  return blob;
}

// Same picture as JPEG, for a storage bucket that does not accept WebP yet (see migration 018)
async function asJpeg(blob) {
  const c = await drawScaled(blob, MAX_SIDE);
  const out = await toBlob(c, 'image/jpeg', JPEG_QUALITY);
  if (!out) throw new Error('bad_image');
  return out;
}

const extOf = (type) => (type === 'image/webp' ? 'webp' : 'jpg');
const isMimeRefused = (error) => /mime|content.?type|not allowed|not supported/i.test(`${error?.message || ''} ${error?.error || ''}`) || String(error?.statusCode) === '415';

// Uploads blobs; pushes each stored path into `uploaded` so callers can clean up on failure.
export async function uploadImages(bucket, folder, blobs, uploaded = []) {
  for (let blob of blobs) {
    const send = (b) => {
      const path = `${folder}/${crypto.randomUUID()}.${extOf(b.type)}`;
      return supabase.storage
        .from(bucket)
        .upload(path, b, { contentType: b.type === 'image/webp' ? 'image/webp' : 'image/jpeg', cacheControl: '31536000', upsert: false })
        .then(({ error }) => ({ path, error }));
    };
    let { path, error } = await send(blob);
    if (error && blob.type === 'image/webp' && isMimeRefused(error)) ({ path, error } = await send((blob = await asJpeg(blob))));
    if (error) throw error;
    uploaded.push(path);
  }
  return uploaded;
}

export async function removeFiles(bucket, paths) {
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
}

// Deletes every file stored under "<uid>/" (any depth) in the user's buckets.
// Throws on failure so the account is not deleted while files remain.
export async function removeUserFolder(uid, buckets = ['listing-images', 'pro-images', 'avatars', 'portfolio-videos', 'verification-docs']) {
  const walk = async (bucket, prefix) => {
    const out = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset });
      if (error) throw error;
      for (const it of data || []) {
        const path = `${prefix}/${it.name}`;
        if (it.id === null) out.push(...(await walk(bucket, path))); // sub-folder
        else out.push(path);
      }
      if (!data || data.length < 100) break;
    }
    return out;
  };
  for (const bucket of buckets) {
    const paths = await walk(bucket, uid);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  }
}
