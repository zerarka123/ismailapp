import { useEffect, useState } from 'react';

// يظهر زر التثبيت فقط عندما يأتي الزائر من الموقع برابط ?install=1
export default function InstallPrompt() {
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
      <button className="btn sand" onClick={install}>📲 ثبّت تطبيق مرسى</button>
    </div>
  );
}
