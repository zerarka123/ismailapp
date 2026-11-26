import { supabaseConfig } from '../_lib/seo.js';

// /m/<bucket>/<path...> — serves public Supabase Storage files.
// With an R2 binding named MEDIA: the first request copies the file from Supabase into R2, and every later
// request is answered by R2 (no egress fees, nothing counted by Supabase). Uploads still go to Supabase as before.
// Without the binding: files are fetched from Supabase and kept in Cloudflare's cache.
// Privacy: users can delete their files, so copies are kept for one day only, and an R2 copy is served only while
// the original still exists in Supabase (checked at most once a day per file and location).
const BUCKETS = new Set(['listing-images', 'pro-images', 'portfolio-videos', 'announcements']);
const DAY = 86400;

function finish(res) {
  const out = new Response(res.body, res);
  if (res.ok) out.headers.set('Cache-Control', `public, max-age=${DAY}`);
  out.headers.set('Access-Control-Allow-Origin', '*'); // the Android app (Capacitor) loads these from another origin
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
}

// Answers from R2, honouring Range requests (video seeking). Returns null if the file is not in R2 yet.
async function fromR2(r2, key, request) {
  const hasRange = request.headers.has('Range');
  const obj = await r2.get(key, hasRange ? { range: request.headers } : undefined);
  if (!obj) return null;
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  if (hasRange && obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set('Content-Length', String(length));
    return finish(new Response(obj.body, { status: 206, headers }));
  }
  headers.set('Content-Length', String(obj.size));
  return finish(new Response(obj.body, { status: 200, headers }));
}

// False only when Supabase says the file is gone. Network or server errors keep the copy available.
async function stillExists(context, key, target) {
  const marker = new Request(`${new URL(context.request.url).origin}/__alive/${key.split('/').map(encodeURIComponent).join('/')}`);
  if (await caches.default.match(marker)) return true;
  try {
    const res = await fetch(target, { method: 'HEAD', cf: { cacheTtl: 0 } });
    if (res.status === 400 || res.status === 404) return false;
    if (res.ok) context.waitUntil(caches.default.put(marker, new Response('1', { headers: { 'Cache-Control': `max-age=${DAY}` } })));
  } catch {
    /* Supabase unreachable */
  }
  return true;
}

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
  const r2 = env.MEDIA && typeof env.MEDIA.get === 'function' ? env.MEDIA : null;

  if (r2) {
    const key = `${bucket}/${rest.join('/')}`;
    try {
      const hit = await fromR2(r2, key, request);
      if (hit) {
        if (await stillExists(context, key, target)) return hit;
        await r2.delete(key); // deleted by its owner: drop our copy too
        return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }
      // first request for this file: copy it from Supabase into R2 (files are at most a few tens of MB)
      const up = await fetch(target);
      if (!up.ok) return new Response(up.body, { status: up.status, headers: { 'Cache-Control': 'public, max-age=60' } });
      await r2.put(key, await up.arrayBuffer(), {
        httpMetadata: { contentType: up.headers.get('content-type') || 'application/octet-stream' },
      });
      const copied = await fromR2(r2, key, request);
      if (copied) return copied;
    } catch {
      // R2 problem: fall through to the plain Supabase path below
    }
  }

  const headers = {};
  const range = request.headers.get('Range');
  if (range) headers.Range = range; // lets <video> seek
  const upstream = await fetch(target, {
    headers,
    cf: { cacheEverything: true, cacheTtl: DAY, cacheTtlByStatus: { '200-299': DAY, '404': 60, '500-599': 0 } },
  });
  return finish(upstream);
}
