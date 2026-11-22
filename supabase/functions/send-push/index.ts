// Supabase Edge Function: sends the push for each new row of public.push_jobs (migration 020).
// One job = one event (a new ad, a new catch...) and ALL the users to notify, so one ad costs ONE call of this
// function and one database query for the devices, instead of one call + 3 queries per user.
// Each user gets the message in the language chosen in the app (profiles.preferred_lang).
//
// Wiring (once): Dashboard → Database → Webhooks → the hook that calls send-push:
//   table: public.push_jobs · events: INSERT · type: Supabase Edge Function → send-push
//   HTTP header: x-webhook-secret = <same value as the WEBHOOK_SECRET secret>
//   (the old hook on public.notifications must be removed or moved to push_jobs: its calls are ignored)
// Secrets: WEBHOOK_SECRET (required), VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (+ optional VAPID_SUBJECT) for the PWA,
//          FCM_SERVICE_ACCOUNT only if you also ship the Android app with Firebase.
// Deploy:  supabase functions deploy send-push --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const PAGE = 1000; // PostgREST max rows per request
const CONCURRENCY = 20; // pushes in flight at the same time

type Lang = 'ar' | 'fr' | 'en';
const IDX: Record<Lang, number> = { ar: 0, fr: 1, en: 2 };

// Same texts as src/i18n/messages.js (notif.*)
const TEXT: Record<string, [string, string, string]> = {
  new_boat: ['🚤 قارب جديد للبيع', '🚤 Nouveau bateau à vendre', '🚤 New boat for sale'],
  new_engine: ['⚙️ محرك جديد للبيع', '⚙️ Nouveau moteur à vendre', '⚙️ New engine for sale'],
  new_equipment: ['🎣 معدات صيد جديدة', '🎣 Nouveau matériel de pêche', '🎣 New fishing equipment'],
  new_job_offer: ['💼 عرض عمل جديد', '💼 Nouvelle offre d’emploi', '💼 New job offer'],
  new_job_request: ['🧑‍🔧 طلب عمل جديد', '🧑‍🔧 Nouvelle demande d’emploi', '🧑‍🔧 New job request'],
  new_generic: ['إعلان جديد في مرسى', 'Nouvelle annonce sur Marsa', 'New listing on Marsa'],
  new_product: ['🛠️ جديد في فرع {branch}', '🛠️ Nouveauté dans la branche {branch}', '🛠️ New in the {branch} branch'],
  new_catch: ['🐟 سمك طازج للبيع في ولايتك', '🐟 Poisson frais à vendre', '🐟 Fresh fish for sale'],
  fish_follow: ['🐟 وصل جديد ممن تتابع', '🐟 Nouvel arrivage de vos suivis', '🐟 New arrival from who you follow'],
  fish_request: ['🛒 زبون يبحث عن سمك في ولايتك', '🛒 Un client cherche du poisson dans votre wilaya', '🛒 A customer needs fish in your wilaya'],
  fish_offer: ['✅ بائع أجاب على طلبك: متوفر', '✅ Un vendeur a répondu : disponible', '✅ A seller replied: available'],
  new_work: ['📸 أعمال جديدة من {business}', '📸 Nouvelles réalisations de {business}', '📸 New work from {business}'],
  generic: ['إشعار جديد', 'Nouvelle notification', 'New notification'],
};
const BRANCHES: Record<string, [string, string]> = {
  shipyards: ['Chantiers navals', 'Shipyards'],
  parts_suppliers: ['Fournisseurs de pièces', 'Parts suppliers'],
  naval_mechanics: ['Mécanique navale', 'Marine mechanics'],
  naval_electrics: ['Électricité navale', 'Marine electrics'],
  gear_shops: ['Magasins de matériel de pêche', 'Fishing gear shops'],
  fishing_trips: ['Sorties de pêche', 'Fishing trips'],
  jobs: ['Emplois maritimes', 'Maritime jobs'],
  inox_workshops: ['Ateliers inox', 'Stainless steel workshops'],
  wood_workshops: ['Ateliers bois & charpente navale', 'Wood & boat carpentry workshops'],
  cold_rooms: ['Chambres froides', 'Cold rooms'],
  fishermen: ['Pêcheur', 'Fisherman'],
};

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
const branchName = (p: Record<string, string>, lang: Lang) =>
  lang === 'ar' ? p.branch_ar || '' : BRANCHES[p.branch]?.[lang === 'fr' ? 0 : 1] || p.branch_ar || '';

function render(type: string, p: Record<string, string>, lang: Lang) {
  const i = IDX[lang];
  if (type === 'new_listing') {
    const key = TEXT[`new_${p.kind}`] ? `new_${p.kind}` : 'new_generic';
    return { title: TEXT[key][i], body: p.title || '' };
  }
  if (type === 'new_product') return { title: fill(TEXT.new_product[i], { branch: branchName(p, lang) }), body: [p.business, p.title].filter(Boolean).join(' · ') };
  if (type === 'new_catch') return { title: TEXT.new_catch[i], body: [p.business, p.title].filter(Boolean).join(' · ') };
  if (type === 'fish_follow') return { title: TEXT.fish_follow[i], body: [p.business, p.title].filter(Boolean).join(' · ') };
  if (type === 'fish_request') return { title: TEXT.fish_request[i], body: [p.item, p.commune].filter(Boolean).join(' · ') };
  if (type === 'fish_offer') return { title: TEXT.fish_offer[i], body: [p.business, p.item].filter(Boolean).join(' · ') };
  if (type === 'new_work') return { title: fill(TEXT.new_work[i], { business: p.business || '' }), body: branchName(p, lang) };
  return { title: TEXT.generic[i], body: p.title || '' };
}

// --- Google OAuth access token from the Firebase service account (JWT signed with RS256) ---
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
  const json = await res.json();
  cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
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

type Target = { kind: 'fcm' | 'web'; user_id: string; token: string; p256dh: string | null; auth: string | null; lang: string };
const asLang = (l: string): Lang => (l === 'fr' || l === 'en' ? l : 'ar');
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });

  const payload = await req.json().catch(() => null);
  // The old hook on public.notifications (one call per user) is ignored: the same event arrives once through push_jobs.
  if (payload?.type !== 'INSERT' || payload?.table !== 'push_jobs') return new Response('ignored');
  const job = payload.record;
  if (!job?.id) return new Response('ignored');

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // 1) every device of the job's users, with their language: one query per 1000 devices
  const targets: Target[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.rpc('marsa_push_job_targets', { p_job: job.id }).range(from, from + PAGE - 1);
    if (error) {
      console.error('targets', error.message);
      return new Response('targets failed', { status: 500 });
    }
    targets.push(...((data || []) as Target[]));
    if (!data || data.length < PAGE) break;
  }
  if (!targets.length) return json({ job: job.id, sent: 0, devices: 0 });

  // 2) the message in each language (rendered once per language, not once per user)
  const path = String(job.path || '/');
  const msg = { ar: render(job.type, job.params || {}, 'ar'), fr: render(job.type, job.params || {}, 'fr'), en: render(job.type, job.params || {}, 'en') };
  let sent = 0;
  let failed = 0;
  const deadWeb: string[] = [];
  const deadFcm: string[] = [];

  // 3a) installed PWA / browsers: standard Web Push (VAPID)
  const webTargets = targets.filter((t) => t.kind === 'web');
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  if (webTargets.length && vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:support@marsadz.app', vapidPublic, vapidPrivate);
    const body = { ar: JSON.stringify({ ...msg.ar, path }), fr: JSON.stringify({ ...msg.fr, path }), en: JSON.stringify({ ...msg.en, path }) };
    await pool(webTargets, CONCURRENCY, async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.token, keys: { p256dh: s.p256dh!, auth: s.auth! } }, body[asLang(s.lang)], { TTL: 86400, urgency: 'high' });
        sent++;
      } catch (e) {
        failed++;
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) deadWeb.push(s.token);
        else console.warn('web push failed', code);
      }
    });
  }

  // 3b) Android app (Firebase Cloud Messaging), only when configured
  const fcmTargets = targets.filter((t) => t.kind === 'fcm');
  const saRaw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (fcmTargets.length && saRaw) {
    const sa = JSON.parse(saRaw);
    const send = (device: string, lang: Lang, token: string) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: device,
            notification: msg[lang],
            data: { path, job: String(job.id) },
            android: { priority: 'high', notification: { channel_id: 'marsa_default', tag: path } },
          },
        }),
      });
    await pool(fcmTargets, CONCURRENCY, async (t) => {
      try {
        let res = await send(t.token, asLang(t.lang), await accessToken(sa));
        if (res.status === 401) res = await send(t.token, asLang(t.lang), await accessToken(sa, true)); // access token expired
        if (res.ok) return void sent++;
        failed++;
        const err = await res.text();
        if (/UNREGISTERED|registration-token-not-registered/.test(err) || (res.status === 400 && /registration token/i.test(err))) deadFcm.push(t.token);
        else console.warn('fcm failed', res.status, err.slice(0, 300));
      } catch (e) {
        failed++;
        console.warn('fcm error', String(e));
      }
    });
  }

  // 4) forget devices that no longer exist (50 per query, not one query per device)
  for (let i = 0; i < deadWeb.length; i += 50) await db.from('web_push_subscriptions').delete().in('endpoint', deadWeb.slice(i, i + 50));
  for (let i = 0; i < deadFcm.length; i += 50) await db.from('push_tokens').delete().in('token', deadFcm.slice(i, i + 50));

  return json({ job: job.id, devices: targets.length, sent, failed, removed: deadWeb.length + deadFcm.length });
});
