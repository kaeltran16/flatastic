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

export async function subscribeUser(
  sub: PushSubscription,
  userAgent?: string,
  userId?: string
) {
  console.log('subscribing user', sub, userAgent, userId);
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          user_agent: userAgent || 'Unknown',
          user_id: userId, // Add user_id to link subscription to user
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
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

// Send notification to specific user by user_id
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    // Fetch user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions found for user' };
    }

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
      badge: '/badge.png',
      data: data || {},
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/view-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/dismiss-icon.png',
        },
      ],
    });

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

          // Remove invalid subscriptions
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

    return {
      success: true,
      sent: successful,
      total: results.length,
    };
  } catch (error) {
    console.error('Error sending push notifications to user:', error);
    return { success: false, error: 'Failed to send notifications' };
  }
}

// Send notification to all users in a household
export async function sendNotificationToHousehold(
  householdId: string,
  title: string,
  message: string,
  data?: any
) {
  try {
    // Get all users in the household
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', householdId);

    if (profilesError || !profiles) {
      return { success: false, error: 'Failed to fetch household members' };
    }

    const userIds = profiles.map((p) => p.id);

    // Get subscriptions for all users in household
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching household subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, error: 'No subscriptions found for household' };
    }

    const notificationPayload = JSON.stringify({
      title,
      body: message,
      icon: '/icon.png',
      badge: '/badge.png',
      data: { ...data, householdId },
    });

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

    return {
      success: true,
      sent: successful,
      total: results.length,
    };
  } catch (error) {
    console.error('Error sending push notifications to household:', error);
    return { success: false, error: 'Failed to send notifications' };
  }
}

// Webhook handler for database notifications
export async function handleDatabaseNotification(notificationData: any) {
  try {
    const { user_id, household_id, title, message, type, is_urgent } =
      notificationData;

    // Send to specific user if user_id is provided
    if (user_id) {
      await sendNotificationToUser(user_id, title, message, {
        type,
        is_urgent,
        notificationId: notificationData.id,
      });
    }

    // Send to household if household_id is provided and no specific user
    else if (household_id) {
      await sendNotificationToHousehold(household_id, title, message, {
        type,
        is_urgent,
        notificationId: notificationData.id,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling database notification:', error);
    return { success: false, error: 'Failed to process notification' };
  }
}

// Keep existing functions for backward compatibility
export async function sendNotification(
  message: string,
  title: string = 'Test Notification'
) {
  try {
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
