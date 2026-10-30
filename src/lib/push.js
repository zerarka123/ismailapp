import { supabase } from '../supabase';
import { PUSH_ENABLED } from '../config';

// Native (Android) push through Firebase Cloud Messaging. Off unless VITE_PUSH_ENABLED=1, because
// PushNotifications.register() crashes the app when android/app/google-services.json is missing.
let token = null;

export async function isNative() {
  const { Capacitor } = await import('@capacitor/core');
  return Capacitor.isNativePlatform();
}

export async function registerNativePush(onOpen) {
  if (!PUSH_ENABLED || !(await isNative())) return false;
  const { Capacitor } = await import('@capacitor/core');
  const { PushNotifications } = await import('@capacitor/push-notifications');
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return false;
  await PushNotifications.createChannel({ id: 'marsa_default', name: 'Marsa', importance: 4 }).catch(() => {});
  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener('registration', async ({ value }) => {
    token = value;
    await supabase.rpc('register_push_token', { p_token: value, p_platform: Capacitor.getPlatform() });
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const path = notification?.data?.path;
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) onOpen(path);
  });
  await PushNotifications.register();
  return true;
}

// Called before sign-out so this device stops receiving the previous account's notifications
export async function forgetPushToken() {
  if (!token) return;
  await supabase.rpc('unregister_push_token', { p_token: token }).then(() => {}, () => {});
  token = null;
}

// Browser notifications (web / PWA) while the app is open in the background
export const webNotifySupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export async function showWebNotification(title, body, path) {
  if (!webNotifySupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: path || 'marsa', data: { path } });
  return true;
}
