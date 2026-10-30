// Loaded by the generated service worker (vite.config.js → workbox.importScripts).
// Opens / focuses the app on the page a notification points to.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.path;
  const path = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'marsa-open', path });
          return c.focus();
        }
      }
      return self.clients.openWindow(path);
    })
  );
});
