import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { registerWebPush, webPushSupported } from '../lib/push';
import Icon from './Icon.jsx';

// Home card that asks signed-in users to allow notifications on this device.
// Before it, the only way was a button inside the notification settings, and few people found it.
// - browser that can receive Web Push and has not answered yet: "Turn on" asks the permission right away
// - iPhone / iPad in Safari (not added to the home screen): Apple only allows notifications in the installed app,
//   so the card explains how to add Marsa to the home screen
// - already allowed, refused in the browser, or the Android app (its own Firebase push): nothing is shown
// "Not now" hides the card for 7 days on this device.

const KEY = 'marsa.notifyPrompt.until';
const LATER_MS = 7 * 24 * 60 * 60 * 1000;

const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || navigator.standalone === true;
const isNativeShell = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

function snoozed() {
  try {
    return Number(localStorage.getItem(KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

// 'ask' | 'ios_install' | null
function whichCard() {
  if (isNativeShell() || snoozed()) return null;
  if (webPushSupported()) return Notification.permission === 'default' ? 'ask' : null;
  if (isIos() && !isStandalone()) return 'ios_install';
  return null;
}

export default function NotifyPrompt() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [card, setCard] = useState(whichCard);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  if (!user || !card) return null;

  function later() {
    try {
      localStorage.setItem(KEY, String(Date.now() + LATER_MS));
    } catch {
      /* storage blocked: the card simply comes back next time */
    }
    setCard(null);
  }

  async function turnOn() {
    setBusy(true);
    const ok = await registerWebPush(true).catch(() => false);
    setBusy(false);
    if (ok) return setCard(null);
    if (Notification.permission === 'denied') setDenied(true);
  }

  if (denied) {
    return (
      <div className="box notify-prompt" role="status">
        <p className="msg err" style={{ margin: 0 }}>{t('notif.device_denied')}</p>
      </div>
    );
  }

  return (
    <div className="box notify-prompt">
      <div className="np-head">
        <span className="np-icon"><Icon name="bell" /></span>
        <div>
          <b>{t('np.title')}</b>
          <p className="muted small">{t(card === 'ask' ? 'np.text' : 'np.ios_text')}</p>
        </div>
      </div>
      <div className="np-actions">
        {card === 'ask' && (
          <button type="button" className="btn sm" onClick={turnOn} disabled={busy}>
            {busy ? t('common.loading') : t('np.turn_on')}
          </button>
        )}
        <button type="button" className="btn alt sm" onClick={later}>{t('np.later')}</button>
      </div>
    </div>
  );
}
