import { APP, SITE, clean, cached, esc, ld, listingImage, priceText, proCard, rest, supabaseConfig } from './_lib/site.js';

// "/" — the static landing page plus two server-rendered sections: guide categories with their latest
// activities, and sponsored ads. Any failure returns the plain landing page untouched.
export async function onRequestGet(context) {
  const { env, next } = context;
  const cfg = supabaseConfig(env);
  const base = await next();
  if (!cfg || !base.ok || !(base.headers.get('content-type') || '').includes('text/html')) return base;

  return cached(context, '/__home', async () => {
    try {
      const [cats, pros, ads] = await Promise.all([
        rest(cfg, 'site_categories?select=slug,name_ar,name_fr,name_en,sort_order,active_count&order=section.asc,sort_order.asc&limit=40'),
        rest(cfg, 'site_pros?select=id,business_name,address,wilaya_ar,category_slug,cover_path,created_at&order=created_at.desc&limit=80'),
        rest(cfg, 'site_sponsored?select=id,title,price_dzd,wilaya_ar,cover_path&order=published_at.desc&limit=6'),
      ]);
      if (!Array.isArray(cats)) return base.clone();
      const byCat = {};
      for (const p of Array.isArray(pros) ? pros : []) (byCat[p.category_slug] ||= []).push(p);

      const catHtml = cats
        .map((c) => {
          const list = (byCat[c.slug] || []).slice(0, 3);
          const ml = (c) => `data-ml data-ar="${esc(c.name_ar)}" data-fr="${esc(c.name_fr || c.name_ar)}" data-en="${esc(c.name_en || c.name_ar)}"`;
          return `<div class="card r v"><h3 ${ml(c)}>${esc(c.name_ar)}</h3>
${list.length ? `<div class="grid-mini">${list.map((p) => proCard(cfg, p)).join('')}</div>` : `<p data-i18n="cat_empty">كن أول من يسجّل نشاطه في هذه الفئة.</p>`}
<a class="btn p2" href="/c/${esc(c.slug)}" data-i18n="view_all">عرض الكل</a></div>`;
        })
        .join('');

      const adHtml = Array.isArray(ads) && ads.length
        ? `<section><div class="in"><h2 data-i18n="sp_t">إعلانات مميزة</h2><div class="grid-mini">${ads
            .map((a) => {
              const img = listingImage(cfg, a.cover_path);
              return `<a class="card" rel="sponsored" href="${APP}/listing/${esc(a.id)}"><div class="im"${img ? ` style="background-image:url('${esc(img)}')"` : ''}></div><div class="tx"><h3>${esc(clean(a.title, 60))}</h3><p>${esc([priceText(a.price_dzd), a.wilaya_ar].filter(Boolean).join(' · '))}</p></div></a>`;
            })
            .join('')}</div><p class="hint" data-i18n="sp_note">إعلانات مموّلة. افتح التطبيق للتواصل مع أصحابها.</p></div></section>`
        : '';

      const section = `<style>.grid-mini{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:14px 0}
.grid-mini .card{padding:0;border-radius:18px;overflow:hidden;display:block;color:var(--fg);text-decoration:none;background:rgba(5,28,44,.7);border:1px solid var(--bd)}
.grid-mini .im{height:120px;background:#0b2536 center/cover no-repeat}.grid-mini .tx{padding:10px 14px}.grid-mini h3{font-size:16px;margin:0 0 2px}.grid-mini p{margin:0;font-size:13px}</style>
<section><div class="in"><h2 data-i18n="cats_t">تصفّح الأنشطة</h2><p data-i18n="cats_p">آخر الأنشطة المسجّلة في كل فئة.</p><div class="grid">${catHtml}</div></div></section>${adHtml}`;

      const jsonld = ld({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', name: 'مرسى', alternateName: 'Marsa', url: SITE, logo: `${SITE}/marsa-poster.jpg` },
          { '@type': 'WebSite', name: 'مرسى', url: SITE, inLanguage: 'ar' },
        ],
      });
      let html = await base.clone().text();
      html = html.replace('<!--MARSA_DYNAMIC-->', section).replace('</head>', `${jsonld}</head>`);
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' } });
    } catch {
      return base.clone();
    }
  });
}
