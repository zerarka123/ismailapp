import { supabaseConfig } from '../_lib/seo.js';

// /m/<bucket>/<path...> — serves public Supabase Storage files through Cloudflare's cache.
// Supabase is asked only on the first request for a file; every later request (any visitor, any
// Range request of a video) is answered by Cloudflare, so it no longer counts as Supabase "Cached Egress".
// Files have unique names (uuid) and are never overwritten, so they can be cached for a year.
const BUCKETS = new Set(['listing-images', 'pro-images', 'portfolio-videos', 'announcements']);
const YEAR = 31536000;

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const cfg = supabaseConfig(env);
  if (!cfg) return new Response('Not configured', { status: 500 });

  const parts = (Array.isArray(params.path) ? params.path : [params.path]).filter(Boolean);
  const [bucket, ...rest] = parts;
  // only known public buckets; no empty, "." or ".." segments
  if (!BUCKETS.has(bucket) || !rest.length || rest.some((p) => !p || p === '.' || p === '..')) {
    return new Response('Not found', { status: 404 });
  }

  const target = `${cfg.base}/storage/v1/object/public/${bucket}/${rest.map(encodeURIComponent).join('/')}`;
  const headers = {};
  const range = request.headers.get('Range');
  if (range) headers.Range = range; // lets <video> seek

  const upstream = await fetch(target, {
    headers,
    cf: { cacheEverything: true, cacheTtl: YEAR, cacheTtlByStatus: { '200-299': YEAR, '404': 60, '500-599': 0 } },
  });

  const out = new Response(upstream.body, upstream);
  if (upstream.ok) out.headers.set('Cache-Control', `public, max-age=${YEAR}, immutable`);
  out.headers.set('Access-Control-Allow-Origin', '*'); // the Android app (Capacitor) loads these from another origin
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
}
