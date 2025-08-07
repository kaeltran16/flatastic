'use client';

import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToNotifications,
} from '@/lib/push-notification';
import { useEffect, useState } from 'react';

export function useNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);

      // Register service worker on mount
      if (Notification.permission === 'granted') {
        initializeServiceWorker();
      }
    }
  }, []);

  const initializeServiceWorker = async () => {
    try {
      await registerServiceWorker();
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await initializeServiceWorker();
        const sub = await subscribeToNotifications();

        if (sub) {
          setSubscription(sub);

          // Send subscription to server
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });

          // Also add to send-notification endpoint for testing
          await fetch('/api/send-notification', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) {
      console.error('No subscription available');
      return;
    }

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification 🚀',
          body: 'This is a test push notification from your PWA!',
          url: '/',
          icon: '/icon-192x192.png',
        }),
      });

      const result = await response.json();
      console.log('Notification sent:', result);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  return {
    permission,
    subscription,
    isLoading,
    requestPermission,
    sendTestNotification,
  };
}
