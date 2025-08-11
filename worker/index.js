// // public/sw.js - Enhanced service worker with debugging
// import { clientsClaim } from 'workbox-core';
// import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// // Precache and route handling
// precacheAndRoute(self.__WB_MANIFEST);
// cleanupOutdatedCaches();
// clientsClaim();

// // Debug logging function
// function debugLog(message, data = null) {
//   console.log(`[SW Debug] ${new Date().toISOString()}: ${message}`, data || '');

//   // Store logs in indexedDB for debugging
//   try {
//     if (data) {
//       console.log('[SW Debug Data]:', JSON.stringify(data, null, 2));
//     }
//   } catch (e) {
//     console.log('[SW Debug] Error stringifying data:', e);
//   }
// }

// // Enhanced push event handler
// self.addEventListener('push', function (event) {
//   debugLog('🔔 Push event received');

//   try {
//     let notificationData;

//     if (event.data) {
//       try {
//         notificationData = event.data.json();
//         debugLog('📦 Push data parsed successfully', notificationData);
//       } catch (parseError) {
//         debugLog('❌ Failed to parse push data as JSON', {
//           error: parseError.message,
//           rawData: event.data.text(),
//         });

//         // Fallback: try to use as plain text
//         notificationData = {
//           title: 'New Notification',
//           body: event.data.text() || 'You have a new message',
//         };
//       }
//     } else {
//       debugLog('⚠️ Push event received but no data');
//       notificationData = {
//         title: 'New Notification',
//         body: 'You have a new message',
//       };
//     }

//     // Ensure we have minimum required data
//     const title = notificationData.title || 'Notification';
//     const options = {
//       body: notificationData.body || 'You have a new message',
//       icon: notificationData.icon || '/web-app-manifest-192x192.png',
//       badge: notificationData.badge || '/web-app-manifest-192x192.png',
//       image: notificationData.image,
//       data: notificationData.data || { url: '/' },
//       tag: notificationData.tag || 'default',
//       requireInteraction: notificationData.requireInteraction || false,
//       actions: notificationData.actions || [],
//       vibrate: notificationData.vibrate || [200, 100, 200],
//       silent: notificationData.silent || false,
//       renotify: true,
//       timestamp: Date.now(),
//     };

//     debugLog('🎯 Showing notification', { title, options });

//     event.waitUntil(
//       self.registration
//         .showNotification(title, options)
//         .then(() => {
//           debugLog('✅ Notification shown successfully');
//         })
//         .catch((error) => {
//           debugLog('❌ Failed to show notification', {
//             error: error.message,
//             stack: error.stack,
//           });
//         })
//     );
//   } catch (error) {
//     debugLog('💥 Critical error in push event handler', {
//       error: error.message,
//       stack: error.stack,
//     });

//     // Emergency fallback notification
//     event.waitUntil(
//       self.registration.showNotification('New Message', {
//         body: 'Unable to parse notification data',
//         icon: '/web-app-manifest-192x192.png',
//         tag: 'error-fallback',
//       })
//     );
//   }
// });

// // Enhanced notification click handler
// self.addEventListener('notificationclick', function (event) {
//   debugLog('👆 Notification clicked', {
//     action: event.action,
//     tag: event.notification.tag,
//     data: event.notification.data,
//   });

//   event.notification.close();

//   if (event.action) {
//     debugLog(`🎭 Action clicked: ${event.action}`);
//     switch (event.action) {
//       case 'view':
//         event.waitUntil(
//           clients.openWindow(event.notification.data?.url || '/')
//         );
//         break;
//       case 'dismiss':
//         debugLog('🚫 Notification dismissed via action');
//         break;
//       default:
//         debugLog(`❓ Unknown action: ${event.action}`);
//     }
//   } else {
//     const urlToOpen = event.notification.data?.url || '/';
//     debugLog(`🌐 Opening URL: ${urlToOpen}`);

//     event.waitUntil(
//       clients
//         .matchAll({ type: 'window', includeUncontrolled: true })
//         .then((clientList) => {
//           debugLog(`🔍 Found ${clientList.length} client(s)`);

//           // Try to focus existing window with same URL
//           for (const client of clientList) {
//             if (client.url === urlToOpen && 'focus' in client) {
//               debugLog('🎯 Focusing existing window');
//               return client.focus();
//             }
//           }

//           // Open new window
//           if (clients.openWindow) {
//             debugLog('🆕 Opening new window');
//             return clients.openWindow(urlToOpen);
//           } else {
//             debugLog('❌ Cannot open new window - not supported');
//           }
//         })
//         .catch((error) => {
//           debugLog('💥 Error handling notification click', {
//             error: error.message,
//           });
//         })
//     );
//   }
// });

// // Notification close handler
// self.addEventListener('notificationclose', function (event) {
//   debugLog('❌ Notification closed', {
//     tag: event.notification.tag,
//     data: event.notification.data,
//   });
// });

// // Service worker install event
// self.addEventListener('install', function (event) {
//   debugLog('📦 Service worker installing');
//   self.skipWaiting();
// });

// // Service worker activate event
// self.addEventListener('activate', function (event) {
//   debugLog('🚀 Service worker activated');
//   event.waitUntil(clients.claim());
// });

// // Message handler for debugging
// self.addEventListener('message', function (event) {
//   debugLog('💬 Message received from client', event.data);

//   if (event.data && event.data.type === 'TEST_NOTIFICATION') {
//     debugLog('🧪 Test notification requested');

//     self.registration
//       .showNotification('Service Worker Test', {
//         body:
//           event.data.message ||
//           'This is a test notification from the service worker',
//         icon: '/web-app-manifest-192x192.png',
//         tag: 'sw-test',
//         data: { url: '/', test: true },
//       })
//       .then(() => {
//         debugLog('✅ Test notification shown');
//         event.ports[0]?.postMessage({ success: true });
//       })
//       .catch((error) => {
//         debugLog('❌ Test notification failed', error);
//         event.ports[0]?.postMessage({ success: false, error: error.message });
//       });
//   }

//   if (event.data && event.data.type === 'SIMULATE_PUSH') {
//     debugLog('🔄 Simulating push event', event.data.payload);

//     // Simulate a push event with the provided payload
//     const simulatedEvent = {
//       data: {
//         json: () => event.data.payload,
//         text: () => JSON.stringify(event.data.payload),
//       },
//       waitUntil: (promise) => promise,
//     };

//     // Process as if it were a real push event
//     try {
//       const payload = event.data.payload;
//       self.registration
//         .showNotification(payload.title || 'Simulated Push', {
//           body: payload.body || 'Simulated push notification',
//           icon: payload.icon || '/icon-192x192.png',
//           data: payload.data || { simulated: true },
//           tag: 'simulated-push',
//         })
//         .then(() => {
//           debugLog('✅ Simulated push notification shown');
//         })
//         .catch((error) => {
//           debugLog('❌ Simulated push notification failed', error);
//         });
//     } catch (error) {
//       debugLog('❌ Error processing simulated push', error);
//     }
//   }
// });

// // Error handler
// self.addEventListener('error', function (event) {
//   debugLog('💥 Service worker error', {
//     message: event.message,
//     filename: event.filename,
//     lineno: event.lineno,
//     colno: event.colno,
//     error: event.error,
//   });
// });

// // Unhandled rejection handler
// self.addEventListener('unhandledrejection', function (event) {
//   debugLog('🚨 Unhandled promise rejection', {
//     reason: event.reason,
//     promise: event.promise,
//   });
// });

// debugLog('🎉 Service worker script loaded and ready');

// TODO: working stuffs
// self.addEventListener('push', function (event) {
//   if (event.data) {
//     const data = event.data.json();
//     const options = {
//       body: data.body,
//       icon: data.icon || '//web-app-manifest-192x192.png',
//       badge: '/web-app-manifest-192x192.png',
//       vibrate: [100, 50, 100],
//       data: {
//         dateOfArrival: Date.now(),
//         primaryKey: '2',
//       },
//     };
//     event.waitUntil(self.registration.showNotification(data.title, options));
//   }
// });

// self.addEventListener('notificationclick', function (event) {
//   console.log('Notification click received.');
//   event.notification.close();
//   event.waitUntil(clients.openWindow('<https://your-website.com>'));
// });

// worker/sw.js - Updated Service Worker with Supabase support

// Import Workbox for better caching strategies
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js'
);

// Configure Workbox
if (workbox) {
  console.log('Workbox loaded successfully');

  // Enable navigation preload for faster navigation
  workbox.navigationPreload.enable();

  // Precache and route for app shell
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  // Runtime caching strategies

  // 1. Supabase API calls - Always use network first, minimal caching
  workbox.routing.registerRoute(
    ({ url }) => url.hostname.includes('supabase.co'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'supabase-api',
      networkTimeoutSeconds: 10,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60, // 1 minute cache
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // 2. Static assets - Cache first
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 3. Google Fonts
  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    })
  );

  workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    })
  );

  // 4. App pages - Network first with cache fallback
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );
} else {
  console.log('Workbox failed to load');
}

// Skip waiting and claim clients immediately
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old cache versions
              return (
                cacheName.startsWith('workbox-') && !cacheName.includes('6.6.0')
              );
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
    ])
  );
});

// Enhanced push notification handler
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

// Enhanced notification click handler
self.addEventListener('notificationclick', function (event) {
  console.log('Notification click received:', event);

  event.notification.close();

  // Get URL from notification data or use default
  const urlToOpen = event.notification.data?.url || '/';

  // Handle action clicks
  if (event.action) {
    console.log('Action clicked:', event.action);
    // Handle different actions here
    switch (event.action) {
      case 'view':
        // Handle view action
        break;
      case 'dismiss':
        // Handle dismiss action
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
        // Check if there's already a window/tab open with the target URL
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If not, open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', function (event) {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync here
      // e.g., sync offline data with Supabase when online
      doBackgroundSync()
    );
  }
});

async function doBackgroundSync() {
  try {
    // Check if online
    if (!navigator.onLine) {
      console.log('Still offline, skipping sync');
      return;
    }

    console.log('Performing background sync...');

    // Add your background sync logic here
    // e.g., sync pending data with Supabase
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error; // This will retry the sync
  }
}

// Handle fetch events with proper error handling
self.addEventListener('fetch', (event) => {
  // Let Workbox handle the routing
  // But add custom logic for specific cases if needed

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // For Supabase requests, ensure they're handled properly
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before returning it
          if (response.status === 200) {
            const responseClone = response.clone();
            // Optionally cache successful responses
            caches.open('supabase-api').then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.error('Supabase fetch failed:', error);
          // Try to return cached version
          return caches.match(event.request);
        })
    );
    return;
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});
