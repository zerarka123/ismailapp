// Keeps the installed web app (PWA) up to date without reinstalling.
// The service worker (vite-plugin-pwa, autoUpdate) installs a new version by itself; here we
// - look for a new version on start, every 30 minutes and whenever the app comes back to the screen
// - reload onto it at once, except on pages where the user may be typing (then a banner asks first)
const FORM_PAGES = ['/sell', '/post/', '/register-business', '/portfolio', '/account', '/login', '/admin', '/notifications'];
const CHECK_EVERY = 30 * 60 * 1000;

const listeners = new Set();
export const onUpdateReady = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const applyUpdate = () => window.location.reload();
const busyPage = () => FORM_PAGES.some((p) => window.location.pathname.startsWith(p));

export async function startAppUpdates() {
  if (!('serviceWorker' in navigator)) return;
  try {
    // The Android build ships its own files and updates through Google Play
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) return;
  } catch {
    /* web */
  }
  const hadController = !!navigator.serviceWorker.controller; // first install: nothing to reload
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    if (busyPage() && document.visibilityState === 'visible') return listeners.forEach((fn) => fn());
    reloading = true;
    window.location.reload();
  });
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
    const check = () => navigator.onLine && reg.update().catch(() => {});
    setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  } catch (e) {
    console.warn('service worker registration failed', e);
  }
}
