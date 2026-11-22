import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './auth.jsx';
import { t as tr, useI18n } from './i18n/index.jsx';
import { categoryName } from './i18n/names.js';
import { isMissingSchema } from './lib/format';
import { isNative, registerNativePush, registerWebPush } from './lib/push';

const Ctx = createContext({ unread: 0, available: true, refresh: () => {}, markAllRead: async () => {} });
export const useNotifications = () => useContext(Ctx);

// Text of one notification row in the current language (rows store a type + params, never a sentence)
export function notificationText(n) {
  const p = n.params || {};
  if (n.type === 'new_listing') {
    const kind = ['boat', 'engine', 'equipment', 'job_offer', 'job_request'].includes(p.kind) ? p.kind : 'generic';
    return { title: tr(`notif.new_${kind}`), body: p.title || '' };
  }
  if (n.type === 'new_product') {
    return { title: tr('notif.new_product', { branch: categoryName({ slug: p.branch, name_ar: p.branch_ar }) }), body: [p.business, p.title].filter(Boolean).join(' · ') };
  }
  if (n.type === 'new_catch') {
    return { title: tr('notif.new_catch'), body: [p.business, p.title].filter(Boolean).join(' · ') };
  }
  if (n.type === 'fish_follow') {
    return { title: tr('notif.fish_follow'), body: [p.business, p.title].filter(Boolean).join(' · ') };
  }
  if (n.type === 'fish_request') {
    return { title: tr('notif.fish_request'), body: [p.item, p.commune].filter(Boolean).join(' · ') };
  }
  if (n.type === 'fish_offer') {
    return { title: tr('notif.fish_offer'), body: [p.business, p.item].filter(Boolean).join(' · ') };
  }
  if (n.type === 'new_work') {
    return { title: tr('notif.new_work', { business: p.business || '' }), body: categoryName({ slug: p.branch, name_ar: p.branch_ar }) };
  }
  return { title: tr('notif.generic'), body: p.title || '' };
}

export function NotificationsProvider({ children }) {
  const { user, profile } = useAuth();
  const { lang } = useI18n();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return setUnread(0);
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null);
    if (error) {
      if (isMissingSchema(error)) setAvailable(false);
      return;
    }
    setAvailable(true);
    setUnread(count ?? 0);
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    setUnread(0);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Bell count without Supabase Realtime (Realtime checked every new row for every open app, which made the whole
  // app slow each time an ad notified hundreds of users). The count is re-read when the app comes back to the screen,
  // every 3 minutes while it is visible, and as soon as the service worker receives a push (message below).
  useEffect(() => {
    if (!user || !available) return undefined;
    const onShow = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    const timer = setInterval(onShow, 3 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
      clearInterval(timer);
    };
  }, [user?.id, available, refresh]);

  // Android: register this device with Firebase once signed in
  useEffect(() => {
    if (!user) return;
    registerNativePush((path) => nav(path)).catch((e) => console.warn('push registration failed', e));
    registerWebPush().catch((e) => console.warn('web push registration failed', e));
  }, [user?.id]);

  // Remember the chosen language on the profile so push messages are sent in it
  useEffect(() => {
    if (!user || !profile || !('preferred_lang' in profile) || profile.preferred_lang === lang) return;
    supabase.from('profiles').update({ preferred_lang: lang }).eq('id', user.id).then(() => {});
  }, [user?.id, profile, lang]);

  // Messages from the service worker: a push arrived, or a notification was clicked (it posts the path back)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMsg = (e) => {
      if (e.data?.type === 'marsa-push') refresh(); // a push just arrived: update the bell
      if (e.data?.type === 'marsa-open' && typeof e.data.path === 'string' && e.data.path.startsWith('/')) nav(e.data.path);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [nav, refresh]);

  const value = useMemo(() => ({ unread, available, refresh, markAllRead }), [unread, available, refresh, markAllRead]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export { isNative };
