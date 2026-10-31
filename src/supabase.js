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

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
