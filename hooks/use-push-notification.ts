// lib/use-push-notifications.ts
'use client';

import { subscribeUser } from '@/app/pwa-nextjs/actions';
import { urlBase64ToUint8Array } from '@/app/pwa-nextjs/utils';
import { createClient } from '@/lib/supabase/client';
import { Notifications } from '@/lib/supabase/schema.alias';
import { useEffect, useState } from 'react';

const SUBSCRIPTION_STORAGE_KEY = 'push-notification-subscription';

interface StoredSubscriptionState {
  isSubscribed: boolean;
  userId: string;
  timestamp: number;
}

export function useNotifications(userId: string) {
  // Notifications data state
  const [notifications, setNotifications] = useState<Notifications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Push notifications state
  const [isSubscribed, setIsSubscribed] = useState(false);

  const supabase = createClient();

  // Helper functions for storage
  const getStoredSubscriptionState = (): StoredSubscriptionState | null => {
    try {
      const stored = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setStoredSubscriptionState = (state: StoredSubscriptionState) => {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Handle storage errors silently
    }
  };

  const clearStoredSubscriptionState = () => {
    try {
      localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    } catch {
      // Handle storage errors silently
    }
  };

  // Check if we should attempt subscription for this user
  const shouldAttemptSubscription = (userId: string): boolean => {
    if (!userId) return false;

    const stored = getStoredSubscriptionState();
    if (!stored) return true; // No stored state, should attempt

    // If stored for different user, should attempt
    if (stored.userId !== userId) return true;

    // If already subscribed according to storage, don't attempt
    if (stored.isSubscribed) return false;

    // If failed recently (within last hour), don't retry
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - stored.timestamp < oneHour) return false;

    return true; // Should retry after an hour
  };

  // Fetch notifications from database
  useEffect(() => {
    async function getNotifications() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Notifications query error:', error);
          setError(error.message);
          return;
        }

        setNotifications(data || []);
      } catch (error: any) {
        console.error('Error loading notifications:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      getNotifications();
    }
  }, [supabase, userId]);

  // Initialize subscription state from storage and service worker
  useEffect(() => {
    const initializeSubscriptionState = async () => {
      if (!userId) return;

      try {
        // Check storage first
        const stored = getStoredSubscriptionState();
        if (stored?.userId === userId && stored.isSubscribed) {
          // Verify with actual service worker subscription
          if ('serviceWorker' in navigator) {
            const registration =
              await navigator.serviceWorker.getRegistration();
            if (registration) {
              const subscription =
                await registration.pushManager.getSubscription();
              if (subscription) {
                setIsSubscribed(true);
                return;
              } else {
                // Storage says subscribed but no actual subscription
                clearStoredSubscriptionState();
              }
            }
          }
        }

        setIsSubscribed(false);
      } catch (error) {
        console.error('Error initializing subscription state:', error);
        setIsSubscribed(false);
      }
    };

    initializeSubscriptionState();
  }, [userId]);

  // Handle push notification subscription
  useEffect(() => {
    if (!shouldAttemptSubscription(userId)) return;

    const autoSubscribe = async () => {
      console.log('Attempting to subscribe to notifications for user:', userId);

      try {
        // Check support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('Push notifications not supported');
          setStoredSubscriptionState({
            isSubscribed: false,
            userId,
            timestamp: Date.now(),
          });
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check existing subscription
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setIsSubscribed(true);
          setStoredSubscriptionState({
            isSubscribed: true,
            userId,
            timestamp: Date.now(),
          });
          return;
        }

        // Request permission
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.log('Notification permission denied');
          setStoredSubscriptionState({
            isSubscribed: false,
            userId,
            timestamp: Date.now(),
          });
          return;
        }

        // Subscribe
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.error('VAPID key not configured');
          setStoredSubscriptionState({
            isSubscribed: false,
            userId,
            timestamp: Date.now(),
          });
          return;
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

        // Send to server
        const result = await subscribeUser(
          JSON.parse(JSON.stringify(subscription)),
          navigator.userAgent,
          userId
        );

        if (result.success) {
          setIsSubscribed(true);
          setStoredSubscriptionState({
            isSubscribed: true,
            userId,
            timestamp: Date.now(),
          });
          console.log('Push notifications enabled');
        } else {
          setStoredSubscriptionState({
            isSubscribed: false,
            userId,
            timestamp: Date.now(),
          });
          console.error('Failed to subscribe on server');
        }
      } catch (error) {
        console.error('Push subscription failed:', error);
        setStoredSubscriptionState({
          isSubscribed: false,
          userId,
          timestamp: Date.now(),
        });
      }
    };

    autoSubscribe();
  }, [userId]); // Only depends on userId now

  // Method to manually retry subscription (useful for UI)
  const retrySubscription = () => {
    clearStoredSubscriptionState();
    // This will trigger the useEffect above
  };

  return {
    notifications,
    loading,
    error,
    isSubscribed,
    retrySubscription,
  };
}
