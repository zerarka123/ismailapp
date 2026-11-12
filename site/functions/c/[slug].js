import { APP, SLUG_RE, SITE, T, cached, categoryNames, clean, esc, htmlResponse, ld, ml, notFoundPage, page, proCard, proImage, rest, supabaseConfig, tr } from '../_lib/site.js';

// /c/:slug — one guide category with its active activities (Arabic in the HTML, French / English swapped in the browser)
export async function onRequestGet(context) {
  const slug = String(context.params.slug || '');
  const cfg = supabaseConfig(context.env);
  if (!SLUG_RE.test(slug) || !cfg) return notFoundPage();
  return cached(context, `/c/${slug}`, async () => {
    const cats = await rest(cfg, `site_categories?slug=eq.${encodeURIComponent(slug)}&select=slug,name_ar,name_fr,name_en&limit=1`);
    if (!Array.isArray(cats)) return htmlResponse(page({ title: T.retry_t[0], titles: T.retry_t, description: T.retry_p[0], path: `/c/${slug}`, body: `${tr('retry_t', 'h1')}${tr('retry_p', 'p')}`, noindex: true }), 503);
    const cat = cats[0];
    if (!cat) return notFoundPage();
    const pros = (await rest(cfg, `site_pros?category_slug=eq.${encodeURIComponent(slug)}&select=id,business_name,description,address,wilaya_ar,cover_path,badge_verified&order=badge_verified.desc,created_at.desc&limit=60`)) || [];
    const names = categoryNames(cat.slug, cat.name_ar, cat.name_fr, cat.name_en);
    const name = names[0];
    const description = clean(`${name} في الجزائر: ${pros.length} نشاط مسجّل في مرسى. تصفّح الأنشطة وافتح التطبيق للتواصل.`, 190);
    const empty = ['لا توجد أنشطة بعد. كن أول من يسجّل نشاطه.', 'Aucune activité pour le moment. Soyez le premier à inscrire la vôtre.', 'No businesses yet. Be the first to register yours.'];
    const body = `<p class="crumbs"><a href="/">${tr('home')}</a> › ${ml(names)}</p>${ml(names, 'h1')}
<p>${pros.length ? `${pros.length} ${tr('count')}` : ml(empty)}</p>
<div class="grid">${pros.map((p) => proCard(cfg, p)).join('')}</div>
<div class="cta">${tr('own_t', 'b')}${tr('own_p', 'p')}<a class="btn" href="${APP}/register-business?cat=${esc(slug)}">${tr('register')}</a></div>`;
    const jsonld = ld({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      url: `${SITE}/c/${slug}`,
      inLanguage: 'ar',
      mainEntity: { '@type': 'ItemList', itemListElement: pros.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/a/${p.id}`, name: clean(p.business_name, 80) })) },
    });
    return htmlResponse(page({ title: name, titles: names, description, path: `/c/${slug}`, image: pros[0]?.cover_path ? proImage(cfg, pros[0].cover_path) : '', body, jsonld }));
  });
}
