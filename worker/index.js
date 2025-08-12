// public/sw.js - Simplified service worker for next-pwa
// next-pwa will handle all the caching and precaching automatically

// Skip waiting and claim clients immediately
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener('push', function (event) {
  console.log('Push event received:', event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push data:', data);

      const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/web-app-manifest-192x192.png',
        badge: data.badge || '/web-app-manifest-192x192.png',
        image: data.image,
        vibrate: data.vibrate || [100, 50, 100],
        tag: data.tag || 'general',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: data.primaryKey || '1',
          url: data.url || '/',
          ...data.data,
        },
      };

      event.waitUntil(
        self.registration.showNotification(
          data.title || 'Notification',
          options
        )
      );
    } catch (error) {
      console.error('Error processing push event:', error);

      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('New Notification', {
          body: 'You have a new notification',
          icon: '/web-app-manifest-192x192.png',
          badge: '/web-app-manifest-192x192.png',
        })
      );
    }
  }
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // Handle action clicks
  if (event.action) {
    console.log('Action clicked:', event.action);
    switch (event.action) {
      case 'view':
        break;
      case 'dismiss':
        return; // Don't open window
      default:
        break;
    }
  }

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        // Focus existing window if available
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional)
self.addEventListener('sync', function (event) {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    if (!navigator.onLine) {
      console.log('Still offline, skipping sync');
      return;
    }

    console.log('Performing background sync...');
    // Add your background sync logic here
    // e.g., sync pending data with Supabase
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// Message handler for testing
self.addEventListener('message', function (event) {
  console.log('Message received from client:', event.data);

  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration
      .showNotification('Service Worker Test', {
        body: event.data.message || 'Test notification',
        icon: '/web-app-manifest-192x192.png',
        tag: 'sw-test',
        data: { url: '/', test: true },
      })
      .then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
      .catch((error) => {
        console.error('Test notification failed:', error);
        event.ports[0]?.postMessage({ success: false, error: error.message });
      });
  }
});

console.log('Service Worker loaded');
