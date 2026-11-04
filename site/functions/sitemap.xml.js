import { SITE, cached, esc, rest, supabaseConfig } from './_lib/site.js';

// /sitemap.xml — home, categories and active activities. Stopped activities drop out within minutes.
export async function onRequestGet(context) {
  const cfg = supabaseConfig(context.env);
  return cached(context, '/__sitemap', async () => {
    const [cats, pros] = cfg
      ? await Promise.all([
          rest(cfg, 'site_categories?select=slug&limit=100'),
          rest(cfg, 'site_pros?select=id,created_at&order=created_at.desc&limit=5000', 6000),
        ])
      : [null, null];
    const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    const url = (loc, lastmod) => `<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    const items = [url(`${SITE}/`)];
    for (const c of Array.isArray(cats) ? cats : []) items.push(url(`${SITE}/c/${c.slug}`));
    for (const p of Array.isArray(pros) ? pros : []) items.push(url(`${SITE}/a/${p.id}`, day(p.created_at)));
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join('')}</urlset>`, {
      status: 200,
      headers: { 'content-type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' },
    });
  });
}
