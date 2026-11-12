import { APP, SITE, T, UUID_RE, cached, categoryNames, clean, esc, htmlResponse, ld, ml, notFoundPage, page, placeHtml, proImage, rest, supabaseConfig, tr, wilayaNames } from '../_lib/site.js';

// /a/:id — public page of one activity. No phone or e-mail is ever read or shown: contact happens in the app.
// The business name, address and description stay as the owner wrote them; everything around them follows the language.
export async function onRequestGet(context) {
  const id = String(context.params.id || '');
  const cfg = supabaseConfig(context.env);
  if (!UUID_RE.test(id) || !cfg) return notFoundPage('gone_t');
  return cached(context, `/a/${id}`, async () => {
    const rows = await rest(cfg, `site_pros?id=eq.${encodeURIComponent(id)}&select=id,business_name,description,address,wilaya_ar,category_slug,category_ar,pro_type,badge_verified,images&limit=1`);
    if (!Array.isArray(rows)) return htmlResponse(page({ title: T.retry_t[0], titles: T.retry_t, description: T.retry_p[0], path: `/a/${id}`, body: `${tr('retry_t', 'h1')}${tr('retry_p', 'p')}`, noindex: true }), 503);
    const p = rows[0];
    if (!p) return notFoundPage('gone_t'); // stopped or hidden in the admin panel: the page disappears
    const name = clean(p.business_name, 90);
    const imgs = (p.images || []).map((x) => proImage(cfg, x)).filter(Boolean);
    const cat = categoryNames(p.category_slug, p.category_ar);
    const place = placeHtml(p.wilaya_ar, p.address, 120);
    const description = clean(`${name}${p.category_ar ? ` — ${p.category_ar}` : ''}${p.wilaya_ar ? ` في ${p.wilaya_ar}` : ''}. ${p.description || ''}`, 190);
    const body = `<p class="crumbs"><a href="/">${tr('home')}</a> › <a href="/c/${esc(p.category_slug)}">${ml(cat)}</a> › ${esc(name)}</p>
<h1>${esc(name)}${p.badge_verified ? ' ✅' : ''}</h1>
<div><span class="pill">${ml(cat)}</span>${p.wilaya_ar ? `<span class="pill">${ml(wilayaNames(p.wilaya_ar))}</span>` : ''}</div>
${place ? `<p>📍 ${place}</p>` : ''}
${imgs.length ? `<div class="gal">${imgs.map((u) => `<img src="${esc(u)}" alt="${esc(name)}" loading="lazy">`).join('')}</div>` : ''}
${p.description ? `<p dir="auto">${esc(clean(p.description, 1500))}</p>` : ''}
<div class="cta"><b>${tr('contact_t')} ${esc(name)}</b>${tr('contact_p', 'p')}<a class="btn" href="${APP}/pro/${esc(p.id)}">${tr('contact_btn')}</a></div>`;
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
