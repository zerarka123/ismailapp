import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Shown only when the visitor arrives with ?install=1 (the site's install button, or the QR link marsadz.app/get):
//   Android / computer: one-tap "install" button (the browser's own install prompt); if the browser does not
//     offer it after a few seconds, a short hint where to find "Install app" in its menu.
//   iPhone (Safari): Apple allows no install button, so a small sheet shows the 3 "Add to Home Screen" steps.
export default function InstallPrompt() {
  const { t } = useI18n();
  const [ready, setReady] = useState(!!window.__bip);
  const [done, setDone] = useState(false);
  const [late, setLate] = useState(false);
  const [closed, setClosed] = useState(false);
  const wanted = new URLSearchParams(location.search).get('install') === '1';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = isIos();

  useEffect(() => {
    const on = () => setReady(true);
    const off = () => setDone(true);
    window.addEventListener('bip-ready', on);
    window.addEventListener('appinstalled', off);
    const timer = setTimeout(() => setLate(true), 4000);
    return () => {
      window.removeEventListener('bip-ready', on);
      window.removeEventListener('appinstalled', off);
      clearTimeout(timer);
    };
  }, []);

  if (!wanted || done || standalone || closed) return null;

  if (ios)
    return (
      <div className="inst-sheet" role="dialog" aria-label={t('install.ios_title')}>
        <button className="inst-x" onClick={() => setClosed(true)} aria-label={t('common.close')}>×</button>
        <b>{t('install.ios_title')}</b>
        <ol>
          <li>{t('install.ios_1')} <span className="inst-share" aria-hidden="true">⬆︎</span></li>
          <li>{t('install.ios_2')}</li>
          <li>{t('install.ios_3')}</li>
        </ol>
        <div className="inst-arrow" aria-hidden="true">⬇︎</div>
      </div>
    );

  async function install() {
    const e = window.__bip;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    window.__bip = null;
    setDone(true);
  }

  if (ready)
    return (
      <div style={{ position: 'fixed', insetInline: 16, bottom: 'calc(16px + var(--sab))', zIndex: 50 }}>
        <button className="btn sand" onClick={install}>📲 {t('install.button')}</button>
      </div>
    );

  if (!late) return null;
  return (
    <div className="inst-sheet" role="note">
      <button className="inst-x" onClick={() => setClosed(true)} aria-label={t('common.close')}>×</button>
      <b>{t('install.menu_title')}</b>
      <p>{t('install.menu_hint')}</p>
    </div>
  );
}
