// This extends the default next-pwa service worker
// Place this file in your project root, not in public/

// Import workbox and next-pwa functionality
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
);

// This will be replaced by next-pwa with the actual precache manifest
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Handle push events
self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action) {
    // Handle action button clicks
    console.log('Action clicked:', event.action);
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_ACTION',
          action: event.action,
          data: event.notification.data,
        });
      });
    });
  } else {
    // Handle main notification click
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // If a window/tab is already open, focus it
        for (const client of clients) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window/tab
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});
