import { esc, rest, siteOf, supabaseConfig } from './_lib/seo.js';

// /sitemap.xml — latest published listings (up to 1000) with lastmod
export async function onRequestGet({ env }) {
  const site = siteOf(env);
  const cfg = supabaseConfig(env);
  const rows = cfg ? await rest(cfg, 'listings?status=eq.published&select=id,bumped_at,published_at&order=bumped_at.desc.nullslast&limit=1000', 6000) : null;
  const urls = [`<url><loc>${esc(site)}/</loc></url>`];
  for (const r of Array.isArray(rows) ? rows : []) {
    const d = new Date(r.bumped_at || r.published_at);
    const last = Number.isNaN(d.getTime()) ? '' : `<lastmod>${d.toISOString()}</lastmod>`;
    urls.push(`<url><loc>${esc(site)}/listing/${esc(r.id)}</loc>${last}</url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' } });
}
