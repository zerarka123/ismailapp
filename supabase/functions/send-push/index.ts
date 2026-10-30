// Supabase Edge Function: sends a Firebase Cloud Messaging push for each new row of public.notifications,
// in the language the user chose in the app (profiles.preferred_lang).
//
// Wiring (once): Dashboard → Database → Webhooks → "Create a new hook"
//   table: public.notifications · events: INSERT · type: Supabase Edge Function → send-push
//   HTTP header: x-webhook-secret = <same value as the WEBHOOK_SECRET secret>
// Secrets: supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)" WEBHOOK_SECRET=<random>
// Deploy:  supabase functions deploy send-push --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

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

async function accessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
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

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('forbidden', { status: 403 });

  const payload = await req.json().catch(() => null);
  const row = payload?.record;
  if (payload?.type !== 'INSERT' || !row?.user_id) return new Response('ignored');

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const [{ data: tokens }, { data: profile }] = await Promise.all([
    db.from('push_tokens').select('token').eq('user_id', row.user_id),
    db.from('profiles').select('preferred_lang').eq('id', row.user_id).maybeSingle(),
  ]);
  if (!tokens?.length) return new Response('no device');

  const lang: Lang = (['ar', 'fr', 'en'].includes(profile?.preferred_lang) ? profile!.preferred_lang : 'ar') as Lang;
  const { title, body } = render(row.type, row.params || {}, lang);
  const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!);
  const token = await accessToken(sa);

  let sent = 0;
  for (const { token: device } of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: device,
          notification: { title, body },
          data: { path: String(row.path || '/'), id: String(row.id) },
          android: { priority: 'high', notification: { channel_id: 'marsa_default', tag: String(row.path || 'marsa') } },
        },
      }),
    });
    if (res.ok) sent++;
    else if (res.status === 404 || res.status === 400) {
      // UNREGISTERED / INVALID_ARGUMENT: the app was uninstalled or the token rotated
      const err = await res.text();
      if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(err)) await db.from('push_tokens').delete().eq('token', device);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'content-type': 'application/json' } });
});
