// public/sw.js - Enhanced service worker with debugging
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

// Precache and route handling
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

// Debug logging function
function debugLog(message, data = null) {
  console.log(`[SW Debug] ${new Date().toISOString()}: ${message}`, data || '');

  // Store logs in indexedDB for debugging
  try {
    if (data) {
      console.log('[SW Debug Data]:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log('[SW Debug] Error stringifying data:', e);
  }
}

// Enhanced push event handler
self.addEventListener('push', function (event) {
  debugLog('🔔 Push event received');

  try {
    let notificationData;

    if (event.data) {
      try {
        notificationData = event.data.json();
        debugLog('📦 Push data parsed successfully', notificationData);
      } catch (parseError) {
        debugLog('❌ Failed to parse push data as JSON', {
          error: parseError.message,
          rawData: event.data.text(),
        });

        // Fallback: try to use as plain text
        notificationData = {
          title: 'New Notification',
          body: event.data.text() || 'You have a new message',
        };
      }
    } else {
      debugLog('⚠️ Push event received but no data');
      notificationData = {
        title: 'New Notification',
        body: 'You have a new message',
      };
    }

    // Ensure we have minimum required data
    const title = notificationData.title || 'Notification';
    const options = {
      body: notificationData.body || 'You have a new message',
      icon: notificationData.icon || '/web-app-manifest-192x192.png',
      badge: notificationData.badge || '/web-app-manifest-192x192.png',
      image: notificationData.image,
      data: notificationData.data || { url: '/' },
      tag: notificationData.tag || 'default',
      requireInteraction: notificationData.requireInteraction || false,
      actions: notificationData.actions || [],
      vibrate: notificationData.vibrate || [200, 100, 200],
      silent: notificationData.silent || false,
      renotify: true,
      timestamp: Date.now(),
    };

    debugLog('🎯 Showing notification', { title, options });

    event.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => {
          debugLog('✅ Notification shown successfully');
        })
        .catch((error) => {
          debugLog('❌ Failed to show notification', {
            error: error.message,
            stack: error.stack,
          });
        })
    );
  } catch (error) {
    debugLog('💥 Critical error in push event handler', {
      error: error.message,
      stack: error.stack,
    });

    // Emergency fallback notification
    event.waitUntil(
      self.registration.showNotification('New Message', {
        body: 'Unable to parse notification data',
        icon: '/web-app-manifest-192x192.png',
        tag: 'error-fallback',
      })
    );
  }
});

// Enhanced notification click handler
self.addEventListener('notificationclick', function (event) {
  debugLog('👆 Notification clicked', {
    action: event.action,
    tag: event.notification.tag,
    data: event.notification.data,
  });

  event.notification.close();

  if (event.action) {
    debugLog(`🎭 Action clicked: ${event.action}`);
    switch (event.action) {
      case 'view':
        event.waitUntil(
          clients.openWindow(event.notification.data?.url || '/')
        );
        break;
      case 'dismiss':
        debugLog('🚫 Notification dismissed via action');
        break;
      default:
        debugLog(`❓ Unknown action: ${event.action}`);
    }
  } else {
    const urlToOpen = event.notification.data?.url || '/';
    debugLog(`🌐 Opening URL: ${urlToOpen}`);

    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          debugLog(`🔍 Found ${clientList.length} client(s)`);

          // Try to focus existing window with same URL
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              debugLog('🎯 Focusing existing window');
              return client.focus();
            }
          }

          // Open new window
          if (clients.openWindow) {
            debugLog('🆕 Opening new window');
            return clients.openWindow(urlToOpen);
          } else {
            debugLog('❌ Cannot open new window - not supported');
          }
        })
        .catch((error) => {
          debugLog('💥 Error handling notification click', {
            error: error.message,
          });
        })
    );
  }
});

// Notification close handler
self.addEventListener('notificationclose', function (event) {
  debugLog('❌ Notification closed', {
    tag: event.notification.tag,
    data: event.notification.data,
  });
});

// Service worker install event
self.addEventListener('install', function (event) {
  debugLog('📦 Service worker installing');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', function (event) {
  debugLog('🚀 Service worker activated');
  event.waitUntil(clients.claim());
});

// Message handler for debugging
self.addEventListener('message', function (event) {
  debugLog('💬 Message received from client', event.data);

  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    debugLog('🧪 Test notification requested');

    self.registration
      .showNotification('Service Worker Test', {
        body:
          event.data.message ||
          'This is a test notification from the service worker',
        icon: '/web-app-manifest-192x192.png',
        tag: 'sw-test',
        data: { url: '/', test: true },
      })
      .then(() => {
        debugLog('✅ Test notification shown');
        event.ports[0]?.postMessage({ success: true });
      })
      .catch((error) => {
        debugLog('❌ Test notification failed', error);
        event.ports[0]?.postMessage({ success: false, error: error.message });
      });
  }

  if (event.data && event.data.type === 'SIMULATE_PUSH') {
    debugLog('🔄 Simulating push event', event.data.payload);

    // Simulate a push event with the provided payload
    const simulatedEvent = {
      data: {
        json: () => event.data.payload,
        text: () => JSON.stringify(event.data.payload),
      },
      waitUntil: (promise) => promise,
    };

    // Process as if it were a real push event
    try {
      const payload = event.data.payload;
      self.registration
        .showNotification(payload.title || 'Simulated Push', {
          body: payload.body || 'Simulated push notification',
          icon: payload.icon || '/icon-192x192.png',
          data: payload.data || { simulated: true },
          tag: 'simulated-push',
        })
        .then(() => {
          debugLog('✅ Simulated push notification shown');
        })
        .catch((error) => {
          debugLog('❌ Simulated push notification failed', error);
        });
    } catch (error) {
      debugLog('❌ Error processing simulated push', error);
    }
  }
});

// Error handler
self.addEventListener('error', function (event) {
  debugLog('💥 Service worker error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', function (event) {
  debugLog('🚨 Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise,
  });
});

debugLog('🎉 Service worker script loaded and ready');
