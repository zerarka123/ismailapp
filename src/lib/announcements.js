import { supabase } from '../supabase';
import { t } from '../i18n/index.jsx';
import { MAX_ANNOUNCEMENT_VIDEO_BYTES } from '../config';
import { prepareImage } from './images';

// Admin announcements (migration 012 + Edge Function send-announcement).
export const ANN_BUCKET = 'announcements';
// Audience keys: "all", "members" (no business account) and the professional_profiles.pro_type values
export const AUDIENCE_KEYS = ['all', 'members', 'fisherman', 'craftsman', 'supplier', 'shop_owner', 'mechanic'];
export const audienceLabel = (k) => t(`ann.aud_${k}`);
export const audienceText = (list) => (list || []).map(audienceLabel).join('، ');

const SELECT = 'id, title, body, media_type, media_url, audience, created_at';
// The pop-up only shows announcements of the last days (a new account does not get months of old news)
const POPUP_DAYS = 7;

export async function listAnnouncements(limit = 30) {
  return supabase.from('announcements').select(SELECT).order('created_at', { ascending: false }).limit(limit);
}

export async function getAnnouncement(id) {
  return supabase.from('announcements').select(SELECT).eq('id', id).maybeSingle();
}

// ids of announcements this user has already seen
export async function readIds(userId, ids) {
  if (!userId || !ids.length) return new Set();
  const { data } = await supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId).in('announcement_id', ids);
  return new Set((data || []).map((r) => r.announcement_id));
}

// Announcements to show in the pop-up: recent, for this user's audience (RLS), not seen yet. Newest first.
export async function unseenAnnouncements(userId) {
  const since = new Date(Date.now() - POPUP_DAYS * 86400000).toISOString();
  const { data, error } = await supabase.from('announcements').select(SELECT).gte('created_at', since).order('created_at', { ascending: false }).limit(5);
  if (error || !data?.length) return [];
  const seen = await readIds(userId, data.map((a) => a.id));
  return data.filter((a) => !seen.has(a.id) && !shownThisSession.has(a.id));
}

// Remember locally too, so the same announcement is never shown twice even if the network call fails
const shownThisSession = new Set();
export const announcementShown = (id) => shownThisSession.has(id);
export async function markAnnouncementRead(id) {
  shownThisSession.add(id);
  await supabase.rpc('mark_announcement_read', { p_id: id }).then(() => {}, () => {});
}

// YouTube / Vimeo links are played in an embedded player; other links in <video>
export function videoEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let yt = null;
    if (host === 'youtu.be') yt = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      yt = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/) || [])[1];
    }
    if (yt && /^[\w-]{6,20}$/.test(yt)) return `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`;
    if (host === 'vimeo.com') {
      const v = (u.pathname.match(/^\/(\d+)/) || [])[1];
      if (v) return `https://player.vimeo.com/video/${v}`;
    }
  } catch {
    /* not a URL */
  }
  return null;
}
export const isVideoFileUrl = (url) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url || '') || (url || '').includes(`/storage/v1/object/public/${ANN_BUCKET}/`);

// ---- admin: media upload ----
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export function checkVideo(file) {
  if (!VIDEO_TYPES.includes(file.type)) throw new Error('ann_video_type');
  if (file.size > MAX_ANNOUNCEMENT_VIDEO_BYTES) throw new Error('ann_video_big');
}

// Image: compressed to max 1600px JPEG (same as listing photos). Video: stored as is (≤ 20 MB).
export async function uploadAnnouncementMedia(kind, file) {
  let blob = file;
  let ext = 'jpg';
  let contentType = 'image/jpeg';
  if (kind === 'image') blob = await prepareImage(file);
  else {
    checkVideo(file);
    contentType = file.type;
    ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
  }
  const path = `${kind}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(ANN_BUCKET).upload(path, blob, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return { path, url: supabase.storage.from(ANN_BUCKET).getPublicUrl(path).data.publicUrl };
}

// Path of a file of our bucket from its public URL (null for outside links)
export function storagePathOf(url) {
  const marker = `/storage/v1/object/public/${ANN_BUCKET}/`;
  const i = (url || '').indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split('?')[0]) : null;
}

export async function removeAnnouncementMedia(url) {
  const path = storagePathOf(url);
  if (path) await supabase.storage.from(ANN_BUCKET).remove([path]).then(() => {}, () => {});
}

// Calls the Edge Function; returns { data } with the delivery report, or { error } with a readable message
export async function sendAnnouncement(payload) {
  const { data, error } = await supabase.functions.invoke('send-announcement', { body: payload });
  if (!error) return { data };
  let code = '';
  try {
    code = (await error.context?.clone?.().json())?.error || '';
  } catch {
    /* no JSON body */
  }
  if (!code && error.context?.status === 404) code = 'no_function';
  if (!code && error.name === 'FunctionsFetchError') code = 'no_function';
  return { error: code, raw: error };
}
