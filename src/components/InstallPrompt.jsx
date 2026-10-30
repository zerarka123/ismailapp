import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

// The install button only shows when the visitor arrives with ?install=1
export default function InstallPrompt() {
  const { t } = useI18n();
  const [ready, setReady] = useState(!!window.__bip);
  const [done, setDone] = useState(false);
  const wanted = new URLSearchParams(location.search).get('install') === '1';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  useEffect(() => {
    const on = () => setReady(true);
    const off = () => setDone(true);
    window.addEventListener('bip-ready', on);
    window.addEventListener('appinstalled', off);
    return () => {
      window.removeEventListener('bip-ready', on);
      window.removeEventListener('appinstalled', off);
    };
  }, []);

  if (!wanted || !ready || done || standalone) return null;

  async function install() {
    const e = window.__bip;
    if (!e) return;
    e.prompt();
    await e.userChoice;
    window.__bip = null;
    setDone(true);
  }

  return (
    <div style={{ position: 'fixed', insetInline: 16, bottom: 'calc(16px + var(--sab))', zIndex: 50 }}>
      <button className="btn sand" onClick={install}>📲 {t('install.button')}</button>
    </div>
  );
}
