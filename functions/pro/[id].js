import { UUID_RE, clean, esc, rest, siteOf, supabaseConfig } from '../_lib/seo.js';

// /pro/:id — serves the normal app page with a canonical URL injected in <head>, so that
// /pro/:id?lang=en and other variants are grouped under /pro/:id. Title and description are
// added when the public profile can be read. Any failure keeps the page working.
export async function onRequestGet({ env, params, next }) {
  const page = await next();
  const id = String(params.id || '').toLowerCase();
  if (!UUID_RE.test(id) || !page.ok || !(page.headers.get('content-type') || '').includes('text/html')) return page;

  const cfg = supabaseConfig(env);
  const rows = cfg
    ? await rest(cfg, `professional_profiles?id=eq.${id}&status=eq.active&select=business_name,description&limit=1`)
    : null;
  const item = Array.isArray(rows) ? rows[0] : null;
  const name = clean(item?.business_name, 90);

  const tags = [`<link rel="canonical" href="${esc(`${siteOf(env)}/pro/${id}`)}">`];
  let rewriter = new HTMLRewriter();
  if (name) {
    const title = `${name} | مرسى`;
    tags.push(`<meta name="description" content="${esc(clean(item.description, 200) || title)}">`);
    rewriter = rewriter.on('title', { element: (e) => e.setInnerContent(title) });
  }
  return rewriter.on('head', { element: (e) => e.append(tags.join('\n'), { html: true }) }).transform(page);
}
