import { SLUG_RE, cached, clean, esc, htmlResponse, ld, page, proCard, proImage, rest, supabaseConfig, SITE } from '../_lib/site.js';

// /c/:slug — one guide category with its active activities
export async function onRequestGet(context) {
  const slug = String(context.params.slug || '');
  const cfg = supabaseConfig(context.env);
  if (!SLUG_RE.test(slug) || !cfg) return notFound();
  return cached(context, `/c/${slug}`, async () => {
    const cats = await rest(cfg, `site_categories?slug=eq.${encodeURIComponent(slug)}&select=slug,name_ar,name_fr,name_en&limit=1`);
    if (!Array.isArray(cats)) return htmlResponse(page({ title: 'مرسى', description: 'تعذر تحميل الصفحة مؤقتًا.', path: `/c/${slug}`, body: '<h1>تعذر تحميل الصفحة مؤقتًا</h1><p>أعد المحاولة بعد قليل.</p>', noindex: true }), 503);
    const cat = cats[0];
    if (!cat) return notFound();
    const pros = (await rest(cfg, `site_pros?category_slug=eq.${encodeURIComponent(slug)}&select=id,business_name,description,address,wilaya_ar,cover_path,badge_verified&order=badge_verified.desc,created_at.desc&limit=60`)) || [];
    const name = cat.name_ar;
    const description = clean(`${name} في الجزائر: ${pros.length} نشاط مسجّل في مرسى. تصفّح الأنشطة وافتح التطبيق للتواصل.`, 190);
    const body = `<p class="crumbs"><a href="/">الرئيسية</a> › ${esc(name)}</p><h1>${esc(name)}</h1>
<p>${pros.length ? `${pros.length} نشاط مسجّل` : 'لا توجد أنشطة بعد. كن أول من يسجّل نشاطه.'}</p>
<div class="grid">${pros.map((p) => proCard(cfg, p)).join('')}</div>
<div class="cta"><b>تملك نشاطًا في هذه الفئة؟</b><p>سجّل نشاطك مجانًا ليراه الصيادون وأصحاب القوارب.</p><a class="btn" href="https://app.marsadz.app/register-business">سجّل نشاطك</a></div>`;
    const jsonld = ld({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      url: `${SITE}/c/${slug}`,
      inLanguage: 'ar',
      mainEntity: { '@type': 'ItemList', itemListElement: pros.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/a/${p.id}`, name: clean(p.business_name, 80) })) },
    });
    return htmlResponse(page({ title: name, description, path: `/c/${slug}`, image: pros[0]?.cover_path ? proImage(cfg, pros[0].cover_path) : '', body, jsonld }));
  });
}

function notFound() {
  return htmlResponse(page({ title: 'الصفحة غير موجودة', description: 'هذه الفئة غير موجودة.', path: '/', body: '<h1>الصفحة غير موجودة</h1><p><a href="/">العودة إلى الرئيسية</a></p>', noindex: true }), 404);
}
