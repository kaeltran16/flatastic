'use client';

import { subscribeUser } from '@/app/pwa-nextjs/actions';
import { urlBase64ToUint8Array } from '@/app/pwa-nextjs/utils';
import { useEffect, useState } from 'react';

interface SilentSubscriberProps {
  userId: string;
  onSubscriptionChange?: (subscribed: boolean) => void;
  onError?: (error: string) => void;
}

export function SilentSubscriber({
  userId,
  onSubscriptionChange,
  onError,
}: SilentSubscriberProps) {
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    console.log('SilentSubscriber', userId);
    // Only attempt once per session
    if (hasAttempted) return;

    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    // Start auto-subscription process
    autoSubscribeToPush();
    setHasAttempted(true);
  }, [hasAttempted]);

  const autoSubscribeToPush = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      await navigator.serviceWorker.ready;

      // Check for existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('Already subscribed to push notifications');
        onSubscriptionChange?.(true);
        return;
      }

      // Check notification permission
      let permission = Notification.permission;

      // If permission is default, try to request it
      if (permission === 'default') {
        // For better UX, you might want to show a custom permission request first
        // For now, we'll directly request permission
        permission = await Notification.requestPermission();
      }

      // If permission denied, stop here
      if (permission !== 'granted') {
        console.log('Notification permission not granted');
        onError?.('Notification permission denied');
        return;
      }

      // Get VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('VAPID public key not configured');
        onError?.('Push notifications not configured');
        return;
      }

      // Subscribe to push notifications
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Send subscription to server
      const result = await subscribeUser(
        JSON.parse(JSON.stringify(subscription)),
        navigator.userAgent,
        userId
      );

      if (result.success) {
        console.log('Successfully subscribed to push notifications');
        onSubscriptionChange?.(true);
      } else {
        console.error('Failed to store subscription on server:', result.error);
        onError?.(result.error || 'Failed to complete subscription');
      }
    } catch (error) {
      console.error('Auto-subscription failed:', error);
      onError?.(error instanceof Error ? error.message : 'Subscription failed');
    }
  };

  // This component renders nothing
  return null;
}
