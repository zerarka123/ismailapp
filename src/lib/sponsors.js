import { supabase } from '../supabase';
import { publicUrl, removeFiles, uploadImages } from './images';

// "عروض المصنّعين": companies (boat builders…) that pay to show their offers (migration 024).
// Photos and logos live in the admin-only "announcements" bucket, folder sponsors/.
export const SPONSOR_BUCKET = 'announcements';
export const SPONSOR_FOLDER = 'sponsors';
export const MAX_OFFER_IMAGES = 6;

export const sponsorImage = (path) => (path ? publicUrl(SPONSOR_BUCKET, path) : null);

const SPONSOR_FIELDS = 'id, name, tagline, description, logo_path, phone, whatsapp, wilaya_id, address, starts_at, ends_at, is_active, sort_order, wilayas(*)';
const OFFER_FIELDS = 'id, sponsor_id, title, description, price_dzd, price_currency, length_m, engine, images, is_active, sort_order, created_at';

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
export async function removeSponsorImages(paths) {
  const mine = (paths || []).filter((p) => typeof p === 'string' && p.startsWith(`${SPONSOR_FOLDER}/`));
  if (mine.length) await removeFiles(SPONSOR_BUCKET, mine);
}

export function sponsorState(s) {
  const now = Date.now();
  if (!s.is_active) return 'paused';
  if (new Date(s.starts_at).getTime() > now) return 'scheduled';
  if (new Date(s.ends_at).getTime() <= now) return 'expired';
  return 'live';
}
