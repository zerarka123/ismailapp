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
  const base = String(env?.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env?.SUPABASE_ANON_KEY || '';
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(base) || !key) return null;
  return { base, key };
}

// Read-only request to the Supabase REST API with the public anon key and a short timeout
export async function rest(cfg, query, ms = 3500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(`${cfg.base}/rest/v1/${query}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, Accept: 'application/json' },
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
  return `${cfg.base}/storage/v1/object/public/listing-images/${safe}`;
}

export function priceText(p) {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString('en-US')} دج` : '';
}

// Builds the <head> tags of one listing; every dynamic value is escaped
export function listingTags({ site, cfg, item }) {
  const id = item.id;
  const wilaya = item.wilayas?.name_ar || '';
  const price = priceText(item.price_dzd);
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
