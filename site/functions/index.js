import { APP, CAT_ICONS, SITE, cached, categoryNames, clean, esc, ld, listingImage, ml, priceHtml, rest, supabaseConfig, wilayaNames } from './_lib/site.js';

// "/" — the static landing page with live sections filled in from the public views:
// hero numbers, wilayas of the search box, sponsored ads, and the six services with their counts.
// Each part falls back on its own (the static block stays), and any failure returns the plain landing page untouched.

const num = (n) => Number(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const between = (html, tag, repl) => html.replace(new RegExp(`<!--${tag}-->[\\s\\S]*?<!--/${tag}-->`), repl);
// ml() with a class on the element
const mlc = (arr, tag, cls) => ml(arr, tag).replace(`<${tag} `, `<${tag} class="${cls}" `);

export async function onRequestGet(context) {
  const { env, next } = context;
  const cfg = supabaseConfig(env);
  const base = await next();
  if (!cfg || !base.ok || !(base.headers.get('content-type') || '').includes('text/html')) return base;

  return cached(context, '/__home', async () => {
    try {
      const [cats, all, ads, stats] = await Promise.all([
        rest(cfg, 'site_categories?select=slug,name_ar,name_fr,name_en,sort_order,active_count&order=section.asc,sort_order.asc&limit=40'),
        rest(cfg, 'site_pros?select=category_slug,wilaya_ar&limit=5000', 5000),
        rest(cfg, 'site_sponsored?select=id,title,price_dzd,price_currency,wilaya_ar,cover_path&order=published_at.desc&limit=8'),
        rest(cfg, 'rpc/site_stats'), // migration 016: users / live listings (counts only). Missing → those two numbers are hidden.
      ]);
      if (!Array.isArray(cats)) return base.clone();
      let html = await base.clone().text();

      // ---- hero numbers: all real, counted from the database at most 5 minutes ago ----
      const pros = Array.isArray(all) ? all : [];
      const wil = new Map();
      for (const p of pros) if (p.wilaya_ar) wil.set(p.wilaya_ar, (wil.get(p.wilaya_ar) || 0) + 1);
      const st = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {};
      const items = [
        [st.users, ['مستخدم', 'utilisateurs', 'users']],
        [pros.length, ['نشاط مسجّل', 'activités inscrites', 'registered businesses']],
        [pros.filter((p) => p.category_slug === 'fishermen').length, ['صياد', 'pêcheurs', 'fishermen']],
        [st.listings, ['إعلان منشور', 'annonces en ligne', 'live listings']],
        [wil.size, ['ولاية', 'wilayas', 'wilayas']],
      ].filter(([n]) => Number.isFinite(Number(n)) && Number(n) > 0);
      if (items.length) html = html.replace('<!--MARSA_STATS-->', `<div class="stats">${items.map(([n, l]) => `<div><b>${num(n)}</b>${ml(l)}</div>`).join('')}</div>`);

      // ---- wilayas of the search box: only those that have businesses, the busiest first ----
      const wOpts = [...wil.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => {
        const [ar, fr, en] = wilayaNames(w);
        return `<option value="${esc(w)}" data-ml data-ar="${esc(ar)}" data-fr="${esc(fr)}" data-en="${esc(en)}">${esc(ar)}</option>`;
      });
      html = html.replace('<!--MARSA_WILAYAS-->', wOpts.join(''));

      // ---- the services, with their live counts ----
      const unit = ['نشاط', 'activité(s)', 'business(es)'];
      const first = ['كن أول من يسجّل', 'Soyez le premier', 'Be the first'];
      const catHtml = cats
        .filter((c) => CAT_ICONS[c.slug])
        .map((c) => {
          const n = Number(c.active_count) || 0;
          return `<a class="cat" href="/c/${esc(c.slug)}"><span class="ic">${CAT_ICONS[c.slug]}</span><span>${ml(categoryNames(c.slug, c.name_ar, c.name_fr, c.name_en), 'strong')}<small>${n ? `${num(n)} ${ml(unit)}` : ml(first)}</small></span></a>`;
        })
        .join('');
      if (catHtml) html = between(html, 'MARSA_CATS', `<div class="grid cats">${catHtml}</div>`);

      // ---- sponsored ads ----
      if (Array.isArray(ads) && ads.length) {
        const adCards = ads
          .map((a) => {
            const img = listingImage(cfg, a.cover_path);
            const meta = a.wilaya_ar ? `<p>${ml(wilayaNames(a.wilaya_ar))}</p>` : '';
            const price = Number(a.price_dzd) > 0 ? `<span class="pr">${priceHtml(a.price_dzd, a.price_currency)}</span>` : '';
            return `<a class="pc" rel="sponsored" href="${APP}/listing/${esc(a.id)}"><div class="im"${img ? ` style="background-image:url('${esc(img)}')"` : ''}></div><div class="tx">${mlc(['مميّز', 'À la une', 'Featured'], 'span', 'badge')}<h3>${esc(clean(a.title, 60))}</h3>${meta}${price}</div></a>`;
          })
          .join('');
        html = html.replace(
          '<!--MARSA_ADS-->',
          `<section style="padding-bottom:0"><div class="in"><div class="head"><div>${ml(['إعلانات مميّزة', 'Annonces à la une', 'Featured listings'], 'h2')}${mlc(['إعلانات مموّلة. افتح التطبيق للتواصل مع أصحابها.', 'Annonces sponsorisées. Ouvrez l’application pour contacter les annonceurs.', 'Sponsored listings. Open the app to contact the sellers.'], 'p', 'sub')}</div><a class="more" href="${APP}">${ml(['شوف كل الإعلانات', 'Voir toutes les annonces', 'See all listings'])}</a></div><div class="grid">${adCards}</div></div></section>`,
        );
      }

      const jsonld = ld({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization', name: 'مرسى', alternateName: 'Marsa', url: SITE, logo: `${SITE}/icon-192.png`,
            email: 'marsadz@gmail.com', telephone: '+213776437374',
            contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', telephone: '+213776437374', email: 'marsadz@gmail.com', areaServed: 'DZ', availableLanguage: ['ar', 'fr', 'en'] },
            sameAs: ['https://www.instagram.com/marsa_dz/', 'https://www.facebook.com/profile.php?id=100064427423141'],
          },
          { '@type': 'WebSite', name: 'مرسى', url: SITE, inLanguage: 'ar' },
        ],
      });
      html = html.replace('</head>', `${jsonld}</head>`);
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' } });
    } catch {
      return base.clone();
    }
  });
}
