import { UUID_RE, listingTags, rest, siteOf, supabaseConfig } from '../_lib/seo.js';

// /listing/:id — serves the normal app page, with Open Graph tags of the listing injected in <head>
// so Facebook, Messenger and WhatsApp can build the preview card. Any failure returns the plain app page.
export async function onRequestGet(context) {
  const { request, env, params, next } = context;
  const id = String(params.id || '');
  const cfg = supabaseConfig(env);
  if (!UUID_RE.test(id) || !cfg) return next();

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + `/listing/${id}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const rows = await rest(
    cfg,
    `listings?id=eq.${encodeURIComponent(id)}&status=eq.published&select=id,title,description,price_dzd,wilayas(name_ar),listing_images(storage_path,sort_order)&limit=1`
  );
  const item = Array.isArray(rows) ? rows[0] : null;
  const page = await next();
  if (!item || !page.ok || !(page.headers.get('content-type') || '').includes('text/html')) return page;

  try {
    const { pageTitle, html } = listingTags({ site: siteOf(env), cfg, item });
    const out = new HTMLRewriter()
      .on('title', { element: (e) => e.setInnerContent(pageTitle) })
      .on('head', { element: (e) => e.append(html, { html: true }) })
      .transform(page);
    const res = new Response(out.body, out);
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300');
    context.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch {
    return page;
  }
}
