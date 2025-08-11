'use server';

import { createClient } from '@supabase/supabase-js';
import webpush, { PushSubscription } from 'web-push';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

webpush.setVapidDetails(
  process.env.NEXT_PUBLIC_VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function subscribeUser(sub: PushSubscription, userAgent?: string) {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          user_agent: userAgent || 'Unknown',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint', // Update if endpoint already exists
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error storing subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in subscribeUser:', error);
    return { success: false, error: 'Failed to store subscription' };
  }
}

export async function unsubscribeUser(endpoint: string) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error removing subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in unsubscribeUser:', error);
    return { success: false, error: 'Failed to remove subscription' };
  }
}

export async function sendNotification(
  message: string,
  title: string = 'Test Notification'
) {
  try {
    // Fetch all active subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions available' };
    }

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
    });

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);

          // If subscription is invalid, remove it from database
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
          }

          return {
            success: false,
            endpoint: sub.endpoint,
            error: error.message,
          };
        }
      })
    );

    const successful = results.filter(
      (result) => result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    return {
      success: true,
      sent: successful,
      failed,
      total: results.length,
    };
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { success: false, error: 'Failed to send notifications' };
  }
}

export async function sendNotificationToEndpoint(
  endpoint: string,
  message: string,
  title: string = 'Notification'
) {
  try {
    // Fetch specific subscription from Supabase
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('endpoint', endpoint)
      .single();

    if (error || !subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title,
        body: message,
        icon: '/icon.png',
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error sending push notification:', error);

    // If subscription is invalid, remove it from database
    if (error.statusCode === 410 || error.statusCode === 404) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    }

    return { success: false, error: 'Failed to send notification' };
  }
}

export async function getAllSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getAllSubscriptions:', error);
    return { success: false, error: 'Failed to fetch subscriptions' };
  }
}
