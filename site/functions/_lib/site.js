// Shared helpers of the marketing site. The Supabase URL and the PUBLIC anon key come from env (no secrets in code).
// Data is read ONLY from the public views site_categories / site_pros / site_sponsored (migration 010).
export const SITE = 'https://marsadz.app';
export const APP = 'https://app.marsadz.app';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_RE = /^[a-z0-9_]{2,40}$/;

export const esc = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const clean = (v, max) => {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

// Data inside <script type="application/ld+json">: "<" is escaped so the content can never close the tag
export const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

export function supabaseConfig(env) {
  const base = String(env?.SUPABASE_URL || env?.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(base) || !key) return null;
  return { base, key };
}

export async function rest(cfg, query, ms = 3500) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const headers = { apikey: cfg.key, Accept: 'application/json' };
    if (!cfg.key.startsWith('sb_')) headers.Authorization = `Bearer ${cfg.key}`;
    const res = await fetch(`${cfg.base}/rest/v1/${query}`, { headers, signal: ctl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const proImage = (cfg, path) =>
  path ? `${cfg.base}/storage/v1/object/public/pro-images/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';
export const listingImage = (cfg, path) =>
  path ? `${cfg.base}/storage/v1/object/public/listing-images/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';

export const priceText = (p) => {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString('en-US')} دج` : '';
};

const CSS = `:root{--bg:#03121c;--fg:#eaf6ff;--mut:#bcd7e8;--ac:#f58b0b;--gl:rgba(5,28,44,.9);--bd:rgba(255,255,255,.18)}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(#0b3a5c,#03121c 60%);background-attachment:fixed;color:var(--fg);font-family:Cairo,Tahoma,sans-serif;line-height:1.7}
a{color:#9fd8ff}.wrap{max-width:1000px;margin:auto;padding:20px 5vw 60px}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 5vw;max-width:1000px;margin:auto}
header a.logo{font-weight:900;font-size:26px;color:#fff;text-decoration:none}
h1{font-size:clamp(26px,5vw,42px);margin:10px 0;font-weight:900;line-height:1.25}h2{font-size:22px;margin:28px 0 10px}
p{color:var(--mut);margin:0 0 14px}.crumbs{font-size:14px;color:var(--mut)}.crumbs a{color:var(--mut)}
.btn{display:inline-block;padding:13px 26px;border-radius:999px;font-weight:700;text-decoration:none;background:var(--ac);color:#1b1000;margin:6px 0}
.btn.alt{background:transparent;color:var(--fg);border:1.5px solid var(--bd)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
.card{background:var(--gl);border:1px solid var(--bd);border-radius:22px;overflow:hidden;color:var(--fg);text-decoration:none;display:block}
.card .im{height:150px;background:#0b2536 center/cover no-repeat}.card .tx{padding:14px 16px}.card h3{margin:0 0 4px;font-size:18px}.card p{margin:0;font-size:14px}
.pill{display:inline-block;border:1px solid var(--bd);border-radius:999px;padding:3px 14px;font-size:13px;margin:0 0 6px 6px;color:var(--mut)}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:16px 0}.gal img{width:100%;height:170px;object-fit:cover;border-radius:16px;display:block}
.cta{background:var(--gl);border:1px solid var(--bd);border-radius:22px;padding:20px;margin:24px 0}
footer{text-align:center;color:var(--mut);font-size:14px;padding:30px 5vw}`;

// Full HTML page. title/description/image are escaped here; `body` and `jsonld` are built by the callers with esc()/ld().
export function page({ title, description, path, image, body, jsonld = '', noindex = false }) {
  const url = `${SITE}${path}`;
  const t = `${clean(title, 90)} | مرسى`;
  const d = clean(description, 200);
  const img = image || `${SITE}/marsa-poster.jpg`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title><meta name="description" content="${esc(d)}">${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${esc(url)}"><meta name="theme-color" content="#03121c">
<meta property="og:type" content="website"><meta property="og:locale" content="ar_DZ"><meta property="og:site_name" content="مرسى">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(t)}"><meta name="twitter:description" content="${esc(d)}"><meta name="twitter:image" content="${esc(img)}">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style>${jsonld}</head><body>
<header><a class="logo" href="/">مرسى</a><a class="btn alt" href="${APP}">افتح التطبيق</a></header>
<main class="wrap">${body}</main>
<footer><a href="/">مرسى</a> · marsadz.app · <a href="${APP}/support">الدعم الفني</a></footer></body></html>`;
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });
}

// Card of one activity (used on the home page, the category page)
export function proCard(cfg, p) {
  const img = proImage(cfg, p.cover_path);
  const where = [p.wilaya_ar, p.address].filter(Boolean).join(' · ');
  return `<a class="card" href="/a/${esc(p.id)}"><div class="im"${img ? ` style="background-image:url('${esc(img)}')"` : ''}></div><div class="tx"><h3>${esc(clean(p.business_name, 60))}</h3><p>${esc(clean(where, 70))}</p></div></a>`;
}

// Caches the rendered page for 5 minutes at the edge, so new / stopped activities show up within minutes
export async function cached(context, key, build) {
  const cache = caches.default;
  const k = new Request(new URL(context.request.url).origin + key, { method: 'GET' });
  const hit = await cache.match(k);
  if (hit) return hit;
  const res = await build();
  if (res && res.status === 200) context.waitUntil(cache.put(k, res.clone()));
  return res;
}
