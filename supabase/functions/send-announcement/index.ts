// Supabase Edge Function: admin announcements ("إعلانات الإدارة").
//
// Called from the admin panel (src/components/AdminAnnouncements.jsx) with the admin's session.
// 1) checks that the caller is an admin (profiles.is_admin)
// 2) saves the announcement in public.announcements
// 3) reads the devices of the chosen audience (push_tokens + web_push_subscriptions, the same tables as send-push)
// 4) sends the push with the same channels and secrets as send-push: Firebase (Android) + Web Push (PWA),
//    removes expired tokens, and writes the delivery report back on the announcement.
//
// Secrets: the ones send-push already uses (FCM_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).
// Deploy:  supabase functions deploy send-announcement --no-verify-jwt
//          (the caller's session is verified inside the function, which also works with the new Supabase API keys)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const AUDIENCES = ['all', 'members', 'fisherman', 'craftsman', 'supplier', 'shop_owner', 'mechanic'];
const MEDIA_TYPES = ['none', 'image', 'video'];
const PAGE = 1000; // PostgREST max rows per request
const CONCURRENCY = 20;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'content-type': 'application/json' } });

// --- Google OAuth access token from the Firebase service account (same method as send-push) ---
let cached: { token: string; exp: number } | null = null;
const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function accessToken(sa: { client_email: string; private_key: string }, force = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!force && cached && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`oauth ${res.status} ${await res.text()}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cached.token;
}

// Runs fn over items with at most n calls in flight
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shorten = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const isHttps = (u: unknown) => {
  try {
    return typeof u === 'string' && u.length <= 1000 && new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};

type Target = { kind: 'fcm' | 'web'; user_id: string; token: string; p256dh: string | null; auth: string | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // 1) caller must be a signed-in admin
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'not_authenticated' }, 401);
  const { data: userData, error: userErr } = await db.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return json({ error: 'not_authenticated' }, 401);
  const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) return json({ error: 'not_admin' }, 403);

  // 2) validate the announcement
  const input = await req.json().catch(() => null);
  if (!input) return json({ error: 'bad_request' }, 400);
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  const mediaType = MEDIA_TYPES.includes(input.media_type) ? input.media_type : 'none';
  const mediaUrl = mediaType === 'none' ? null : input.media_url;
  let audience: string[] = Array.isArray(input.audience) ? [...new Set(input.audience.map(String))] as string[] : [];
  audience = audience.filter((a) => AUDIENCES.includes(a));
  if (audience.includes('all')) audience = ['all'];
  if (title.length < 2 || title.length > 80) return json({ error: 'bad_title' }, 400);
  if (body.length > 2000) return json({ error: 'bad_body' }, 400);
  if (mediaType !== 'none' && !isHttps(mediaUrl)) return json({ error: 'bad_media_url' }, 400);
  if (!audience.length) return json({ error: 'bad_audience' }, 400);

  const { data: ann, error: insErr } = await db
    .from('announcements')
    .insert({ title, body, media_type: mediaType, media_url: mediaUrl, audience, created_by: user.id, status: 'sending' })
    .select('id')
    .single();
  if (insErr || !ann) return json({ error: 'save_failed', detail: insErr?.message }, 500);
  const id: string = ann.id;

  try {
    // 3) devices of the audience, page by page
    const targets: Target[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.rpc('marsa_announcement_targets', { p_audience: audience }).range(from, from + PAGE - 1);
      if (error) throw new Error(`targets: ${error.message}`);
      targets.push(...((data || []) as Target[]));
      if (!data || data.length < PAGE) break;
    }
    const { data: reach } = await db.rpc('admin_announcement_reach', { p_audience: audience });

    // 4) the message: title + short text + image (only for image announcements)
    const pushBody = shorten(body.replace(/\s+/g, ' '), 140);
    const image = mediaType === 'image' ? mediaUrl : undefined;
    const path = `/news?a=${id}`;
    let sent = 0;
    let failed = 0;
    let removed = 0;

    // 4a) installed PWA / browsers: Web Push (VAPID)
    const webTargets = targets.filter((t) => t.kind === 'web');
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    if (webTargets.length && vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:support@marsadz.app', vapidPublic, vapidPrivate);
      const message = JSON.stringify({ title, body: pushBody, path, image });
      await pool(webTargets, CONCURRENCY, async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.token, keys: { p256dh: s.p256dh!, auth: s.auth! } }, message, { TTL: 86400, urgency: 'high' });
          sent++;
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await db.from('web_push_subscriptions').delete().eq('endpoint', s.token);
            removed++;
          } else console.warn('web push failed', code);
        }
      });
    } else if (webTargets.length) failed += webTargets.length;

    // 4b) Android app: Firebase Cloud Messaging
    const fcmTargets = targets.filter((t) => t.kind === 'fcm');
    const saRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (fcmTargets.length && saRaw) {
      const sa = JSON.parse(saRaw);
      const send = (device: string, token: string) =>
        fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: device,
              notification: { title, body: pushBody, ...(image ? { image } : {}) },
              data: { path, announcement_id: id },
              android: { priority: 'high', notification: { channel_id: 'marsa_default', tag: `ann-${id}` } },
            },
          }),
        });
      await pool(fcmTargets, CONCURRENCY, async ({ token: device }) => {
        try {
          let res = await send(device, await accessToken(sa));
          if (res.status === 401) res = await send(device, await accessToken(sa, true)); // access token expired
          if (res.status === 429 || res.status >= 500) {
            await sleep(1000);
            res = await send(device, await accessToken(sa));
          }
          if (res.ok) return void sent++;
          failed++;
          const err = await res.text();
          // Only remove a token when Firebase says the TOKEN itself is dead (not for a bad image or payload)
          const dead =
            /UNREGISTERED|registration-token-not-registered/.test(err) ||
            (res.status === 400 && /registration token/i.test(err));
          if (dead) {
            await db.from('push_tokens').delete().eq('token', device);
            removed++;
          } else console.warn('fcm failed', res.status, err.slice(0, 300));
        } catch (e) {
          failed++;
          console.warn('fcm error', String(e));
        }
      });
    } else if (fcmTargets.length) failed += fcmTargets.length;

    const report = {
      status: 'sent',
      recipients: (reach as { users?: number } | null)?.users ?? new Set(targets.map((t) => t.user_id)).size,
      devices: targets.length,
      sent,
      failed,
    };
    await db.from('announcements').update(report).eq('id', id);
    return json({ id, ...report, removed });
  } catch (e) {
    console.error('announcement failed', String(e));
    await db.from('announcements').update({ status: 'failed' }).eq('id', id);
    return json({ id, error: 'send_failed', detail: String(e) }, 500);
  }
});
