import { supabase } from '../supabase';
import { publicUrl, removeFiles, uploadImages } from './images';

// "عروض المصنّعين": companies (boat builders…) that pay to show their offers (migrations 024, 025).
// Photos added by the admin live in the admin-only "announcements" bucket, folder sponsors/.
// A company linked to its guide account adds its own offers (up to max_offers); its photos go to its own
// folder of pro-images (<uid>/sponsor/...). The folder name tells the bucket apart.
export const SPONSOR_BUCKET = 'announcements';
export const SPONSOR_FOLDER = 'sponsors';
export const MAX_OFFER_IMAGES = 6;

const OWNER_BUCKET = 'pro-images';
const bucketOf = (path) => (String(path).startsWith(`${SPONSOR_FOLDER}/`) ? SPONSOR_BUCKET : OWNER_BUCKET);
export const sponsorImage = (path) => (path ? publicUrl(bucketOf(path), path) : null);

// Logo: the one the admin uploaded, else the photo of the linked guide account
export function sponsorLogo(s) {
  if (s?.logo_path) return sponsorImage(s.logo_path);
  const imgs = s?.professional_profiles?.professional_images || [];
  const first = [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0];
  return first ? publicUrl(OWNER_BUCKET, first.storage_path) : null;
}

const SPONSOR_FIELDS =
  'id, name, tagline, description, logo_path, phone, whatsapp, wilaya_id, address, starts_at, ends_at, is_active, sort_order, professional_id, max_offers, wilayas(*), professional_profiles(id, owner_id, business_name, professional_images(storage_path, sort_order))';
const OFFER_FIELDS = 'id, sponsor_id, title, description, price_dzd, price_currency, length_m, engine, images, is_active, sort_order, created_at, created_by';

const bySort = (a, b) => a.sort_order - b.sort_order || String(a.created_at || '').localeCompare(String(b.created_at || ''));

// Live companies for the home strip, with the cover photo of their first offer. Cached 2 minutes.
let cache = null;
export async function listLiveSponsors() {
  if (cache && Date.now() - cache.t < 120000) return cache.data;
  const { data, error } = await supabase
    .from('sponsors')
    .select(`${SPONSOR_FIELDS}, sponsor_offers(id, images, sort_order, is_active)`)
    .order('sort_order')
    .order('created_at')
    .limit(20);
  if (error) throw error;
  const now = Date.now();
  // the database already hides what is not live for visitors; the admin sees everything, so filter here too
  const live = (data || []).filter((s) => s.is_active && new Date(s.starts_at).getTime() <= now && new Date(s.ends_at).getTime() > now);
  const out = live.map((s) => {
    const offers = (s.sponsor_offers || []).filter((o) => o.is_active).sort(bySort);
    const cover = offers.find((o) => o.images?.length)?.images[0] || null;
    return { ...s, offers_count: offers.length, cover_path: cover };
  });
  cache = { t: Date.now(), data: out };
  return out;
}
export const clearSponsorsCache = () => {
  cache = null;
};

export async function getSponsor(id) {
  const { data, error } = await supabase.from('sponsors').select(`${SPONSOR_FIELDS}, sponsor_offers(${OFFER_FIELDS})`).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, sponsor_offers: (data.sponsor_offers || []).sort(bySort) };
}

// ---- statistics: impression (seen on the home strip), view (page opened), call, whatsapp ----
const SEEN_KEY = 'marsa.sponsors.seen';
function seenOnce(key) {
  try {
    const seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]');
    if (Array.isArray(seen) && seen.includes(key)) return false;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...(Array.isArray(seen) ? seen.slice(-199) : []), key]));
  } catch {
    /* storage blocked: count anyway */
  }
  return true;
}
export function trackSponsor(id, event) {
  if (!id) return;
  // impressions and page views count once per app session; every call / WhatsApp tap counts
  if ((event === 'impression' || event === 'view') && !seenOnce(`${event}:${id}`)) return;
  supabase.rpc('track_sponsor', { p_sponsor: id, p_event: event }).then(() => {}, () => {});
}

// ---- admin ----
export async function adminListSponsors() {
  const [a, b] = await Promise.all([
    supabase.from('sponsors').select(`${SPONSOR_FIELDS}, created_at, sponsor_offers(${OFFER_FIELDS})`).order('sort_order').order('created_at', { ascending: false }),
    supabase.rpc('admin_sponsor_stats', { p_days: 30 }),
  ]);
  if (a.error) throw a.error;
  const stats = new Map((b.data || []).map((s) => [s.sponsor_id, s]));
  return (a.data || []).map((s) => ({ ...s, sponsor_offers: (s.sponsor_offers || []).sort(bySort), stats: stats.get(s.id) || null }));
}

export async function uploadSponsorImages(blobs) {
  return uploadImages(SPONSOR_BUCKET, SPONSOR_FOLDER, blobs, []);
}
// Removes files of either bucket (the admin may delete a company's photos: storage policy of migration 025)
export async function removeSponsorImages(paths) {
  const list = (paths || []).filter((p) => typeof p === 'string' && p);
  const admin = list.filter((p) => bucketOf(p) === SPONSOR_BUCKET);
  const owner = list.filter((p) => bucketOf(p) === OWNER_BUCKET);
  if (admin.length) await removeFiles(SPONSOR_BUCKET, admin);
  if (owner.length) await removeFiles(OWNER_BUCKET, owner);
}

// ---- the company itself (owner of the linked guide account) ----
export const uploadOwnerImages = (uid, blobs) => uploadImages(OWNER_BUCKET, `${uid}/sponsor`, blobs, []);

// The placement of the signed-in user's guide account (null when the admin has not enabled it)
export async function mySponsor(uid) {
  if (!uid) return null;
  const pros = await supabase.from('professional_profiles').select('id').eq('owner_id', uid);
  if (pros.error) throw pros.error;
  const ids = (pros.data || []).map((p) => p.id);
  if (!ids.length) return null;
  const { data, error } = await supabase
    .from('sponsors')
    .select(`${SPONSOR_FIELDS}, sponsor_offers(${OFFER_FIELDS})`)
    .in('professional_id', ids)
    .limit(1);
  if (error) throw error;
  const s = data?.[0];
  return s ? { ...s, sponsor_offers: (s.sponsor_offers || []).sort(bySort) } : null;
}
export async function mySponsorStats() {
  const { data, error } = await supabase.rpc('my_sponsor_stats', { p_days: 30 });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : null) || null;
}

export function sponsorState(s) {
  const now = Date.now();
  if (!s.is_active) return 'paused';
  if (new Date(s.starts_at).getTime() > now) return 'scheduled';
  if (new Date(s.ends_at).getTime() <= now) return 'expired';
  return 'live';
}
