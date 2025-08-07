// public/sw-custom.js
// This file will be merged with the generated service worker

// Push notification handler
self.addEventListener('push', function (event) {
  console.log('Push event received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/web-app-manifest-192x192.png',
      badge: data.badge || '/web-app-manifest-192x192.png',
      image: data.image,
      data: data.data || {},
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      vibrate: data.vibrate || [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action) {
    // Handle action button clicks
    console.log('Action clicked:', event.action);

    // You can add custom logic for different actions here
    switch (event.action) {
      case 'view':
        event.waitUntil(
          clients.openWindow(event.notification.data?.url || '/')
        );
        break;
      case 'dismiss':
        // Just close, no action needed
        break;
      default:
        console.log('Unknown action:', event.action);
    }
  } else {
    // Handle notification body click
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          // Check if there's already a window/tab open with the target URL
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }

          // If no window/tab is already open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Notification close handler
self.addEventListener('notificationclose', function (event) {
  console.log('Notification closed:', event.notification.tag);

  // You can track notification dismissals here
  // Example: send analytics event
});

// Background sync for offline notification queuing (optional)
self.addEventListener('sync', function (event) {
  if (event.tag === 'background-notification') {
    event.waitUntil(
      // Handle background notification sync
      console.log('Background sync for notifications')
    );
  }
});
