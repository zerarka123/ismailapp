import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './auth.jsx';
import { t as tr, useI18n } from './i18n/index.jsx';
import { categoryName } from './i18n/names.js';
import { isMissingSchema } from './lib/format';
import { isNative, registerNativePush, showWebNotification } from './lib/push';

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
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) return setUnread(0);
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    if (error) {
      if (isMissingSchema(error)) setAvailable(false);
      return;
    }
    setAvailable(true);
    setUnread(count ?? 0);
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    setUnread(0);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live: a new row for this user arrives through Supabase Realtime
  useEffect(() => {
    if (!user || !available) return undefined;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, async ({ new: row }) => {
        setUnread((u) => u + 1);
        const { title, body } = notificationText(row);
        // Hidden tab / installed PWA: system notification. Visible: small in-app banner.
        const shown = document.visibilityState === 'hidden' && (await showWebNotification(title, body, row.path));
        if (!shown) {
          setToast({ title, body, path: row.path });
          clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 6000);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, available]);

  // Android: register this device with Firebase once signed in
  useEffect(() => {
    if (!user) return;
    registerNativePush((path) => nav(path)).catch((e) => console.warn('push registration failed', e));
  }, [user?.id]);

  // Remember the chosen language on the profile so push messages are sent in it
  useEffect(() => {
    if (!user || !profile || !('preferred_lang' in profile) || profile.preferred_lang === lang) return;
    supabase.from('profiles').update({ preferred_lang: lang }).eq('id', user.id).then(() => {});
  }, [user?.id, profile, lang]);

  // Clicking a web notification: the service worker posts the path back
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMsg = (e) => {
      if (e.data?.type === 'marsa-open' && typeof e.data.path === 'string' && e.data.path.startsWith('/')) nav(e.data.path);
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [nav]);

  const value = useMemo(() => ({ unread, available, refresh, markAllRead }), [unread, available, refresh, markAllRead]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <button
          type="button"
          className="toast"
          onClick={() => {
            setToast(null);
            if (toast.path) nav(toast.path);
          }}
        >
          <b>🔔 {toast.title}</b>
          {toast.body && <span>{toast.body}</span>}
        </button>
      )}
    </Ctx.Provider>
  );
}

export { isNative };
