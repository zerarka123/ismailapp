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

// Web Push (PWA): the server sends { title, body, path, image? }; show it even when the app is closed.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const title = d.title || 'Marsa';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.path || 'marsa',
      data: { path: d.path || '/' },
      // admin announcements may carry a picture (shown by Chrome / Android browsers, ignored elsewhere)
      ...(typeof d.image === 'string' && d.image.startsWith('https://') ? { image: d.image } : {}),
    })
  );
});
