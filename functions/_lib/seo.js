// Helpers for the share-preview functions (no secrets here: the Supabase URL and anon key come from env).
export const SITE_DEFAULT = 'https://app.marsadz.app';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Escapes text for use inside HTML text and attribute values
export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Collapses whitespace and control characters, then cuts to max characters
export const clean = (v, max) => {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

export const siteOf = (env) => String(env?.SITE_URL || SITE_DEFAULT).replace(/\/+$/, '');

export function supabaseConfig(env) {
  // SUPABASE_URL / SUPABASE_ANON_KEY win; the project's existing build variables are used as a fallback
  const base = String(env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(base) || !key) return null;
  return { base, key };
}

// Read-only request to the Supabase REST API with the public anon key and a short timeout
export async function rest(cfg, query, ms = 3500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    // New-style keys (sb_publishable_...) are not JWTs: they go in the apikey header only
    const headers = { apikey: cfg.key, Accept: 'application/json' };
    if (!cfg.key.startsWith('sb_')) headers.Authorization = `Bearer ${cfg.key}`;
    const res = await fetch(`${cfg.base}/rest/v1/${query}`, {
      headers,
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Absolute https URL of a public listing image
export function imageUrl(cfg, path) {
  const safe = String(path || '').split('/').map(encodeURIComponent).join('/');
  // through the cached media route (R2) so link-preview bots and crawlers do not count as Supabase egress
  return `${SITE_DEFAULT}/m/listing-images/${safe}`;
}

// Same short units as the app (src/lib/price.js): M = million dinars, mi = billion dinars
export function priceText(p, currency = 'DZD') {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return '';
  const fmt = (v) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (currency === 'EUR') return `${fmt(n)} €`;
  if (currency === 'USD') return `${fmt(n)} $`;
  if (n >= 1e9) return `${fmt(n / 1e9)} مليار دج`;
  if (n >= 1e6) return `${fmt(n / 1e6)} مليون دج`;
  return `${fmt(n)} دج`;
}

// Builds the <head> tags of one listing; every dynamic value is escaped
export function listingTags({ site, cfg, item }) {
  const id = item.id;
  const wilaya = item.wilayas?.name_ar || '';
  const price = priceText(item.price_dzd, item.price_currency);
  const title = clean(item.title, 90) || 'إعلان';
  const pageTitle = `${title} | مرسى`;
  const lead = [price, wilaya].filter(Boolean).join(' · ');
  const body = clean(item.description, 160);
  const description = clean([lead, body].filter(Boolean).join(' — ') || 'إعلان على مرسى، سوق الصيادين وأصحاب القوارب.', 200);
  const images = [...(item.listing_images || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const image = images[0]?.storage_path ? imageUrl(cfg, images[0].storage_path) : `${site}/icon-512.png`;
  const url = `${site}/listing/${id}`;
  const m = (attr, name, value) => `<meta ${attr}="${name}" content="${esc(value)}">`;
  return {
    pageTitle,
    html: [
      m('name', 'description', description),
      `<link rel="canonical" href="${esc(url)}">`,
      m('property', 'og:type', 'product'),
      m('property', 'og:site_name', 'مرسى'),
      m('property', 'og:locale', 'ar_DZ'),
      m('property', 'og:title', pageTitle),
      m('property', 'og:description', description),
      m('property', 'og:url', url),
      m('property', 'og:image', image),
      m('property', 'og:image:alt', title),
      m('name', 'twitter:card', 'summary_large_image'),
      m('name', 'twitter:title', pageTitle),
      m('name', 'twitter:description', description),
      m('name', 'twitter:image', image),
    ].join('\n'),
  };
}
