import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SUPABASE_KEY, SUPABASE_URL, supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';

// Asks Supabase once whether the Google provider is switched on, so the button never leads to an error page.
let enabled = null;
async function googleEnabled() {
  if (enabled !== null) return enabled;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    enabled = r.ok && !!(await r.json())?.external?.google;
  } catch {
    enabled = false;
  }
  return enabled;
}

// "Continue with Google": signs in, or creates the account on first use. Web / installed web app only:
// the Android build would need a deep link to come back from Google, so the button is hidden there.
export default function GoogleButton({ next = '/', onError }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    googleEnabled().then(setShow);
  }, []);

  if (!show) return null;

  async function go() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}`, queryParams: { prompt: 'select_account' } },
    });
    if (error) {
      setBusy(false);
      onError?.(errorText(error));
    }
  }

  return (
    <>
      <button type="button" className="btn google" onClick={go} disabled={busy}>
        <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {busy ? t('common.wait') : t('login.google')}
      </button>
      <div className="or-sep"><span>{t('login.or')}</span></div>
    </>
  );
}
