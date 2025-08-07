// hooks/useNotifications.ts
'use client';

import {
  getCurrentSubscription,
  isPushNotificationSupported,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  type PushSubscriptionData,
} from '@/lib/push-notification';
import { useEffect, useState } from 'react';

export function useNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(isPushNotificationSupported());

      if ('Notification' in window) {
        setPermission(Notification.permission);

        // Check for existing subscription on mount
        if (Notification.permission === 'granted') {
          checkExistingSubscription();
        }
      }
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const currentSub = await getCurrentSubscription();
      if (currentSub) {
        setSubscription(currentSub);
        // Register service worker if not already registered
        await registerServiceWorker();
      }
    } catch (error) {
      console.error('Failed to check existing subscription:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await requestNotificationPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await registerServiceWorker();
        const sub = await subscribeToNotifications();

        if (sub) {
          setSubscription(sub);

          // Send subscription to server
          const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });

          if (!response.ok) {
            throw new Error('Failed to save subscription to server');
          }

          // Also add to send-notification endpoint for testing
          await fetch('/api/send-notification', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });

          return true;
        }
      } else if (permission === 'denied') {
        setError(
          'Notification permission denied. Please enable notifications in your browser settings.'
        );
      }

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to setup notifications: ${errorMessage}`);
      console.error('Error requesting permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!subscription) {
      setError('No subscription available');
      return false;
    }

    setIsLoading(true);
    setError(null);

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

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      console.log('Notification sent:', result);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to send notification: ${errorMessage}`);
      console.error('Error sending test notification:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await unsubscribeFromNotifications();

      if (success && subscription) {
        // Remove from server
        await fetch('/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        setSubscription(null);
      }

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to unsubscribe: ${errorMessage}`);
      console.error('Error unsubscribing:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    permission,
    subscription,
    isLoading,
    error,
    isSupported,
    requestPermission,
    sendTestNotification,
    unsubscribe,
    clearError,
  };
}
