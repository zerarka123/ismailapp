import { APP, SITE, UUID_RE, cached, clean, esc, htmlResponse, ld, page, proImage, rest, supabaseConfig } from '../_lib/site.js';

// /a/:id — public page of one activity. No phone or e-mail is ever read or shown: contact happens in the app.
export async function onRequestGet(context) {
  const id = String(context.params.id || '');
  const cfg = supabaseConfig(context.env);
  if (!UUID_RE.test(id) || !cfg) return notFound();
  return cached(context, `/a/${id}`, async () => {
    const rows = await rest(cfg, `site_pros?id=eq.${encodeURIComponent(id)}&select=id,business_name,description,address,wilaya_ar,category_slug,category_ar,pro_type,badge_verified,images&limit=1`);
    if (!Array.isArray(rows)) return htmlResponse(page({ title: 'مرسى', description: 'تعذر تحميل الصفحة مؤقتًا.', path: `/a/${id}`, body: '<h1>تعذر تحميل الصفحة مؤقتًا</h1><p>أعد المحاولة بعد قليل.</p>', noindex: true }), 503);
    const p = rows[0];
    if (!p) return notFound(); // stopped or hidden in the admin panel: the page disappears
    const name = clean(p.business_name, 90);
    const imgs = (p.images || []).map((x) => proImage(cfg, x)).filter(Boolean);
    const place = [p.wilaya_ar, p.address].filter(Boolean).join(' · ');
    const description = clean(`${name}${p.category_ar ? ` — ${p.category_ar}` : ''}${p.wilaya_ar ? ` في ${p.wilaya_ar}` : ''}. ${p.description || ''}`, 190);
    const body = `<p class="crumbs"><a href="/">الرئيسية</a> › <a href="/c/${esc(p.category_slug)}">${esc(p.category_ar)}</a> › ${esc(name)}</p>
<h1>${esc(name)}${p.badge_verified ? ' ✅' : ''}</h1>
<div><span class="pill">${esc(p.category_ar)}</span>${p.wilaya_ar ? `<span class="pill">${esc(p.wilaya_ar)}</span>` : ''}</div>
${place ? `<p>📍 ${esc(place)}</p>` : ''}
${imgs.length ? `<div class="gal">${imgs.map((u) => `<img src="${esc(u)}" alt="${esc(name)}" loading="lazy">`).join('')}</div>` : ''}
${p.description ? `<p>${esc(clean(p.description, 1500))}</p>` : ''}
<div class="cta"><b>للتواصل مع ${esc(name)}</b><p>رقم الهاتف وواتساب متاحان داخل التطبيق للمستخدمين المسجّلين.</p><a class="btn" href="${APP}/pro/${esc(p.id)}">افتح التطبيق للتواصل</a></div>`;
    const jsonld = ld({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name,
      description: clean(p.description, 300) || undefined,
      image: imgs.length ? imgs : undefined,
      url: `${SITE}/a/${p.id}`,
      address: { '@type': 'PostalAddress', addressRegion: p.wilaya_ar || undefined, streetAddress: clean(p.address, 120) || undefined, addressCountry: 'DZ' },
    });
    return htmlResponse(page({ title: name, description, path: `/a/${p.id}`, image: imgs[0] || '', body, jsonld }));
  });
}

function notFound() {
  return htmlResponse(page({ title: 'النشاط غير متاح', description: 'هذا النشاط غير متاح حاليًا.', path: '/', body: '<h1>النشاط غير متاح حاليًا</h1><p><a href="/">العودة إلى الرئيسية</a></p>', noindex: true }), 404);
}
