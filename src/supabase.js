import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
}

// used by the Google button to read the public auth settings
export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

// shown under network errors to tell which backend this build talks to (the address is public)
export const SUPABASE_HOST = (() => {
  try {
    return new URL(url).host;
  } catch {
    return `invalid URL: ${url}`;
  }
})();

// Database requests give up after 30 s instead of spinning forever on a dead connection (the screens then show
// their normal "no connection / try again" message). Uploads, sign-in and realtime are left untouched.
const REST_TIMEOUT_MS = 30000;
function fetchWithTimeout(input, init = {}) {
  const target = typeof input === 'string' ? input : String(input?.url ?? input);
  if (init.signal || !target.includes('/rest/v1/') || typeof AbortController === 'undefined') return fetch(input, init);
  const ctl = new AbortController();
  const timer = setTimeout(() => {
    try {
      ctl.abort(new DOMException('network timeout', 'TimeoutError'));
    } catch {
      ctl.abort();
    }
  }, REST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  global: { fetch: fetchWithTimeout },
});
