import { supabase } from '../supabase';
import { isMissingSchema } from './format';

// Usage statistics for the admin panel (migration 014). Every call is fire-and-forget: tiny request, empty
// answer (no egress), never blocks or breaks a screen. Before the migration runs, the first "missing function"
// answer switches tracking off for the session.

const DEVICE_KEY = 'marsa.device';
const OPEN_KEY = 'marsa.last-open';
const VIEWS_KEY = 'marsa.views';
// The same device is counted again at most every 30 minutes (opening, coming back to the app)
const OPEN_EVERY_MS = 30 * 60 * 1000;

let off = false;

function rpc(name, args) {
  if (off) return;
  try {
    supabase.rpc(name, args).then(
      ({ error }) => {
        if (error && isMissingSchema(error)) off = true;
      },
      () => {}
    );
  } catch {
    /* never let statistics break the app */
  }
}

function read(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
function write(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* storage blocked (private mode) */
  }
}

function newUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let memoryDevice = null;
// Anonymous id of this phone / browser (no personal data). Lets us count visitors who are not signed in.
function deviceId() {
  const saved = read(localStorage, DEVICE_KEY);
  if (saved && UUID_RE.test(saved)) return saved;
  memoryDevice = memoryDevice || newUuid();
  write(localStorage, DEVICE_KEY, memoryDevice);
  return memoryDevice;
}

function platform() {
  try {
    const p = window.Capacitor?.getPlatform?.();
    if (p === 'android' || p === 'ios') return p;
    if (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone) return 'pwa';
  } catch {
    /* ignore */
  }
  return 'web';
}

// App opened or back in the foreground. A sign-in / sign-out counts right away so the visit is linked to the account.
export function trackOpen(userId) {
  const now = Date.now();
  const uid = userId || '';
  let last = null;
  try {
    last = JSON.parse(read(localStorage, OPEN_KEY) || 'null');
  } catch {
    last = null;
  }
  if (last && last.uid === uid && now - Number(last.t) < OPEN_EVERY_MS && now >= Number(last.t)) return;
  write(localStorage, OPEN_KEY, JSON.stringify({ t: now, uid }));
  rpc('track_app_open', { p_device: deviceId(), p_platform: platform() });
}

// Tap on a call / WhatsApp button.
//   channel: 'call' | 'whatsapp'
//   type:    'listing' | 'pro' | 'fish_request' | 'fish_offer'
//   screen:  where the button is (listing, pro_page, pro_quick, cold_offers, fisher_offers, fish_request)
//   branch:  the branch being browsed, when the screen knows it (guide_categories.slug)
export function trackContact(channel, type, id, screen, branch) {
  if (id == null || id === '') return;
  rpc('track_contact', { p_channel: channel, p_target_type: type, p_target_id: String(id), p_screen: screen || null, p_branch: branch || null });
}

// An item page was opened: counted once per item per app session.
export function trackView(type, id, branch) {
  if (id == null || id === '') return;
  const key = `${type}:${id}`;
  let seen = [];
  try {
    seen = JSON.parse(read(sessionStorage, VIEWS_KEY) || '[]');
  } catch {
    seen = [];
  }
  if (!Array.isArray(seen)) seen = [];
  if (seen.includes(key)) return;
  write(sessionStorage, VIEWS_KEY, JSON.stringify([...seen.slice(-199), key]));
  rpc('track_view', { p_target_type: type, p_target_id: String(id), p_branch: branch || null });
}
