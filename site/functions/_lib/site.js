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
// Same price with the currency in the visitor's language ("دج" / "DA" / "DZD")
export const priceHtml = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return '';
  const v = n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
  return ml([`${v} دج`, `${v} DA`, `${v} DZD`]);
};

// ---- Languages (same three as the app and the landing page; the choice is kept in localStorage "marsa.lang") ----
// Wilaya names: the public views only expose the Arabic name, so French / English come from this table (official codes 1–58).
const WILAYAS_AR = ['أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار', 'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر', 'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة', 'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'ورقلة', 'وهران', 'البيض', 'إليزي', 'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تيسمسيلت', 'الوادي', 'خنشلة', 'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية', 'غليزان', 'تيميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس', 'عين صالح', 'عين قزام', 'توقرت', 'جانت', 'المغير', 'المنيعة'];
const WILAYAS_LATIN = ['Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Béni Abbès', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', "El M'Ghair", 'El Meniaa'];
const arKey = (v) => String(v ?? '').replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/^ال/, '').replace(/\s+/g, '');
const WILAYA_INDEX = new Map(WILAYAS_AR.map((n, i) => [arKey(n), i]));

// [ar, fr, en] of a wilaya from its Arabic name (unknown names stay as they are in every language)
export function wilayaNames(ar) {
  const i = WILAYA_INDEX.get(arKey(ar));
  if (i == null) return [ar || '', ar || '', ar || ''];
  return [ar, WILAYAS_LATIN[i], i === 15 ? 'Algiers' : WILAYAS_LATIN[i]];
}

// Guide branches, used when a row only carries the Arabic name (same table as src/i18n/names.js)
const CATEGORY_NAMES = {
  shipyards: ['Chantiers navals', 'Shipyards'],
  naval_mechanics: ['Mécanique et électricité navales', 'Marine mechanics & electrics'],
  gear_shops: ['Magasins de matériel de pêche', 'Fishing gear shops'],
  inox_workshops: ['Ateliers inox', 'Stainless steel workshops'],
  cold_rooms: ['Chambres froides / Poissonnerie', 'Cold rooms / Fish market'],
  fishermen: ['Pêcheur', 'Fisherman'],
};
export function categoryNames(slug, ar, fr, en) {
  const pair = CATEGORY_NAMES[slug] || [];
  return [ar || '', fr || pair[0] || ar || '', en || pair[1] || ar || ''];
}

// Text shown in the visitor's language: Arabic is rendered (search engines, no-JS), the page script swaps it.
export const ml = ([ar, fr, en], tag = 'span') =>
  `<${tag} data-ml data-fr="${esc(fr)}" data-en="${esc(en)}" data-ar="${esc(ar)}">${esc(ar)}</${tag}>`;
// "تيبازة · Bou Haroun" → the wilaya is translated, the address stays as the owner typed it
export const placeHtml = (wilayaAr, address, max = 70) =>
  [wilayaAr ? ml(wilayaNames(wilayaAr)) : '', address ? esc(clean(address, max)) : ''].filter(Boolean).join(' · ');

// Fixed sentences of the server-rendered pages
export const T = {
  open_app: ['افتح التطبيق', 'Ouvrir l’application', 'Open the app'],
  support: ['الدعم الفني', 'Support technique', 'Technical support'],
  wa: ['واتساب', 'WhatsApp', 'WhatsApp'],
  privacy: ['سياسة الخصوصية', 'Confidentialité', 'Privacy policy'],
  terms: ['شروط الاستخدام', 'Conditions d’utilisation', 'Terms of use'],
  home: ['الرئيسية', 'Accueil', 'Home'],
  back_home: ['العودة إلى الرئيسية', 'Retour à l’accueil', 'Back to home'],
  count: ['نشاط مسجّل', 'activité(s) inscrite(s)', 'registered business(es)'],
  own_t: ['تملك نشاطًا في هذه الفئة؟', 'Vous avez une activité dans cette catégorie ?', 'Do you run a business in this category?'],
  own_p: ['سجّل نشاطك مجانًا ليراه الصيادون وأصحاب القوارب.', 'Inscrivez-la gratuitement pour être vu par les pêcheurs et les propriétaires de bateaux.', 'Register it for free to be seen by fishermen and boat owners.'],
  register: ['سجّل نشاطك', 'Inscrire mon activité', 'Register my business'],
  contact_t: ['للتواصل مع', 'Pour contacter', 'To contact'],
  contact_p: ['رقم الهاتف وواتساب متاحان داخل التطبيق للمستخدمين المسجّلين.', 'Le téléphone et WhatsApp sont disponibles dans l’application pour les utilisateurs inscrits.', 'Phone and WhatsApp are available in the app for registered users.'],
  contact_btn: ['افتح التطبيق للتواصل', 'Ouvrir l’application pour contacter', 'Open the app to get in touch'],
  nf_t: ['الصفحة غير موجودة', 'Page introuvable', 'Page not found'],
  nf_p: ['الرابط غير صحيح أو أن الصفحة حُذفت.', 'Le lien est incorrect ou la page a été supprimée.', 'The link is wrong or the page was removed.'],
  gone_t: ['النشاط غير متاح حاليًا', 'Cette activité n’est pas disponible', 'This business is not available'],
  retry_t: ['تعذر تحميل الصفحة مؤقتًا', 'Page momentanément indisponible', 'Page temporarily unavailable'],
  retry_p: ['أعد المحاولة بعد قليل.', 'Réessayez dans un instant.', 'Please try again in a moment.'],
};
export const tr = (key, tag = 'span') => ml(T[key], tag);

// Runs before first paint: picks the language like the landing page (?lang= → saved choice → browser), then swaps texts.
const LANG_SCRIPT = `<script>(function(){var I={ar:1,fr:1,en:1},l='ar';try{var q=new URLSearchParams(location.search).get('lang'),s=localStorage.getItem('marsa.lang');l=I[q]?q:I[s]?s:/^fr/.test(navigator.language)?'fr':/^en/.test(navigator.language)?'en':'ar';if(I[q])localStorage.setItem('marsa.lang',q)}catch(e){}
function a(){var h=document.documentElement;h.lang=l;h.dir=l==='ar'?'rtl':'ltr';
document.querySelectorAll('[data-ml]').forEach(function(n){var v=n.getAttribute('data-'+l);if(v!=null)n.textContent=v});
var t=document.querySelector('meta[name=ml-title]');if(t)document.title=(t.getAttribute('data-'+l)||t.getAttribute('data-ar'))+' | '+(l==='ar'?'مرسى':'Marsa');
document.querySelectorAll('a[href^="https://app.marsadz.app"]').forEach(function(x){try{var u=new URL(x.href);u.searchParams.set('lang',l);x.href=u.toString()}catch(e){}});
document.querySelectorAll('.langsw button').forEach(function(b){var on=b.getAttribute('data-lang')===l;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)})}
document.querySelectorAll('.langsw button').forEach(function(b){b.addEventListener('click',function(){l=b.getAttribute('data-lang');try{localStorage.setItem('marsa.lang',l)}catch(e){}a()})});a()})();</script>`;

const CSS = `:root{--bg:#03121c;--fg:#eaf6ff;--mut:#bcd7e8;--ac:#f58b0b;--gl:rgba(5,28,44,.9);--bd:rgba(255,255,255,.18)}
*{box-sizing:border-box}html{background:#03121c}body{margin:0;min-height:100vh;background:#03121c linear-gradient(#0b3a5c,#03121c 60%);background-attachment:fixed;color:var(--fg);font-family:Cairo,Tahoma,sans-serif;line-height:1.7}
a{color:#9fd8ff}.wrap{max-width:1000px;margin:auto;padding:20px 5vw 60px}
header{display:flex;justify-content:space-between;align-items:center;padding:14px 5vw;max-width:1000px;margin:auto}
header a.logo{font-weight:900;font-size:26px;color:#fff;text-decoration:none;display:flex;align-items:center;gap:10px}header a.logo img{border-radius:9px;display:block}
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
footer{text-align:center;color:var(--mut);font-size:14px;padding:30px 5vw}
header .hr{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.langsw{display:flex;gap:2px;padding:3px;border-radius:999px;background:var(--gl);border:1px solid var(--bd)}
.langsw button{font:inherit;font-weight:700;font-size:13px;border:0;border-radius:999px;padding:5px 11px;background:none;color:var(--fg);cursor:pointer}
.langsw button.on{background:var(--ac);color:#1b1000}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 22px}.chips a{border:1px solid var(--bd);border-radius:999px;padding:6px 16px;color:var(--fg);text-decoration:none;font-size:15px;min-height:40px;display:inline-flex;align-items:center}.chips a.on{background:var(--ac);border-color:var(--ac);color:#1b1000;font-weight:700}
.card[hidden]{display:none}`;

// Full HTML page. title/description/image are escaped here; `body` and `jsonld` are built by the callers with esc()/ld().
// `titles` = [ar, fr, en] when the title has a translation (the tab title then follows the chosen language).
export function page({ title, titles, description, path, image, body, jsonld = '', noindex = false }) {
  const url = `${SITE}${path}`;
  const t = `${clean(title, 90)} | مرسى`;
  const d = clean(description, 200);
  const img = image || `${SITE}/marsa-poster.jpg`;
  const tt = (titles || [title, title, title]).map((x) => clean(x, 90));
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title><meta name="description" content="${esc(d)}">${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="ml-title" data-ar="${esc(tt[0])}" data-fr="${esc(tt[1])}" data-en="${esc(tt[2])}">
<link rel="canonical" href="${esc(url)}"><link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="theme-color" content="#03121c">
<meta property="og:type" content="website"><meta property="og:locale" content="ar_DZ"><meta property="og:site_name" content="مرسى">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(t)}"><meta name="twitter:description" content="${esc(d)}"><meta name="twitter:image" content="${esc(img)}">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style>${jsonld}</head><body>
<header><a class="logo" href="/"><img src="/logo.png" width="36" height="36" alt="">${ml(['مرسى', 'Marsa', 'Marsa'])}</a><div class="hr"><div class="langsw" role="radiogroup" aria-label="Langue / اللغة / Language"><button type="button" role="radio" data-lang="ar" lang="ar">ع</button><button type="button" role="radio" data-lang="fr" lang="fr">FR</button><button type="button" role="radio" data-lang="en" lang="en">EN</button></div><a class="btn alt" href="${APP}">${tr('open_app')}</a></div></header>
<main class="wrap">${body}</main>
<footer><a href="/">${ml(['مرسى', 'Marsa', 'Marsa'])}</a> · marsadz.app · <a href="${APP}/support">${tr('support')}</a> · <a href="https://wa.me/213776437374" target="_blank" rel="noopener noreferrer">${tr('wa')}</a> · <a href="tel:+213776437374" dir="ltr">0776 43 73 74</a> · <a href="mailto:marsadz@gmail.com" dir="ltr">marsadz@gmail.com</a> · <a href="${APP}/privacy.html">${tr('privacy')}</a> · <a href="${APP}/terms.html">${tr('terms')}</a></footer>${LANG_SCRIPT}</body></html>`;
}

// 404 page shared by /a/* and /c/* (same wording as site/404.html)
export const notFoundPage = (key = 'nf_t') =>
  htmlResponse(page({ title: T[key][0], titles: T[key], description: T.nf_p[0], path: '/', body: `${tr(key, 'h1')}${tr('nf_p', 'p')}<p><a class="btn" href="/">${tr('back_home')}</a></p>`, noindex: true }), 404);

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
  });
}

// Card of one activity (used on the home page, the category page)
// Icons of the six guide branches (same as the static cards of site/index.html)
export const CAT_ICONS = {
  "fishermen": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 12c3-4.5 7-6.5 11-6.5 4 0 7 3 9 6.5-2 3.5-5 6.5-9 6.5-4 0-8-2-11-6.5z\"/><path d=\"M2 12l-0 0M6 9l-2-3M6 15l-2 3\"/><circle cx=\"16\" cy=\"11\" r=\"1\"/></svg>",
  "naval_mechanics": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1\"/></svg>",
  "gear_shops": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 9l1.5-5h15L21 9\"/><path d=\"M4 9v11h16V9\"/><path d=\"M3 9h18\"/><path d=\"M9 20v-6h6v6\"/></svg>",
  "cold_rooms": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7\"/><path d=\"M9 4l3 2 3-2M9 20l3-2 3 2\"/></svg>",
  "inox_workshops": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z\"/></svg>",
  "shipyards": "<svg viewBox=\"0 0 24 24\" width=\"28\" height=\"28\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 20h20\"/><path d=\"M4 16l2-6h12l2 6z\"/><path d=\"M12 10V4l5 3-5 0\"/></svg>"
};

export function proCard(cfg, p) {
  const img = proImage(cfg, p.cover_path);
  return `<a class="card" href="/a/${esc(p.id)}" data-w="${esc(p.wilaya_ar || '')}"><div class="im"${img ? ` style="background-image:url('${esc(img)}')"` : ''}></div><div class="tx"><h3>${esc(clean(p.business_name, 60))}</h3><p>${placeHtml(p.wilaya_ar, p.address, 50)}</p></div></a>`;
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
