// lib/use-push-notifications.ts
'use client';

import { subscribeUser } from '@/app/pwa-nextjs/actions';
import { urlBase64ToUint8Array } from '@/app/pwa-nextjs/utils';
import { createClient } from '@/lib/supabase/client';
import { Notifications } from '@/lib/supabase/schema.alias';
import { useEffect, useState } from 'react';

export function useNotifications(userId: string) {
  // Notifications data state
  const [notifications, setNotifications] = useState<Notifications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Push notifications state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const supabase = createClient();

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

    getNotifications();
  }, [supabase]);

  // Handle push notification subscription
  useEffect(() => {
    if (hasAttempted) return;

    const autoSubscribe = async () => {
      console.log('attempt to subscribe to notifications');
      try {
        // Check support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          return;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check existing subscription
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setIsSubscribed(true);
          return;
        }

        // Request permission
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        // Subscribe
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

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
          console.log('Push notifications enabled');
        }
      } catch (error) {
        console.error('Push subscription failed:', error);
      } finally {
        setHasAttempted(true);
      }
    };

    autoSubscribe();
  }, [hasAttempted, userId]);

  return {
    notifications,
    loading,
    error,
    isSubscribed,
  };
}
