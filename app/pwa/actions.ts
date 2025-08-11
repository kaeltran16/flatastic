'use server';

import { createClient } from '@supabase/supabase-js';
import webpush, { PushSubscription } from 'web-push';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY! // Use service role for server actions
);

// Configure VAPID with Apple-compatible settings
webpush.setVapidDetails(
  process.env.NEXT_PUBLIC_VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Type for database row
type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
};

// Helper function to convert database row to PushSubscription object
function dbRowToPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  } as PushSubscription;
}

// Helper function to extract auth and p256dh from subscription
function extractSubscriptionKeys(sub: PushSubscription) {
  let authKey: string;
  let p256dhKey: string;

  if (sub.keys) {
    // Already in the right format
    authKey =
      typeof sub.keys.auth === 'string'
        ? sub.keys.auth
        : Buffer.from(sub.keys.auth).toString('base64');
    p256dhKey =
      typeof sub.keys.p256dh === 'string'
        ? sub.keys.p256dh
        : Buffer.from(sub.keys.p256dh).toString('base64');
    // @ts-ignore
  } else if (sub.getKey) {
    // Browser format - convert to base64
    // @ts-ignore
    const authBuffer = sub.getKey('auth');
    // @ts-ignore
    const p256dhBuffer = sub.getKey('p256dh');

    if (!authBuffer || !p256dhBuffer) {
      throw new Error('Missing required encryption keys');
    }

    authKey = Buffer.from(authBuffer).toString('base64');
    p256dhKey = Buffer.from(p256dhBuffer).toString('base64');
  } else {
    throw new Error('Invalid subscription format - missing keys');
  }

  return { authKey, p256dhKey };
}

export async function subscribeUser(sub: PushSubscription) {
  try {
    console.log('=== Starting Supabase subscription process ===');

    // Validate subscription
    if (!sub.endpoint) {
      throw new Error('Invalid subscription: missing endpoint');
    }

    // Extract keys
    const { authKey, p256dhKey } = extractSubscriptionKeys(sub);

    // Get user agent (if available on server side)
    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side';

    console.log('Subscription details:', {
      endpoint: `${sub.endpoint.substring(0, 50)}...`,
      hasAuth: !!authKey,
      hasP256dh: !!p256dhKey,
      userAgent: userAgent.substring(0, 50) + '...',
    });

    // Check if subscription already exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', sub.endpoint)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new subscriptions
      throw new Error(`Database check failed: ${checkError.message}`);
    }

    const subscriptionData = {
      endpoint: sub.endpoint,
      p256dh: p256dhKey,
      auth: authKey,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    };

    if (existingSubscription) {
      // Update existing subscription
      console.log('Updating existing subscription');
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (updateError) {
        throw new Error(
          `Failed to update subscription: ${updateError.message}`
        );
      }

      console.log('✓ Successfully updated existing subscription');
    } else {
      // Insert new subscription
      console.log('Creating new subscription');
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert([subscriptionData]);

      if (insertError) {
        throw new Error(
          `Failed to create subscription: ${insertError.message}`
        );
      }

      console.log('✓ Successfully created new subscription');
    }

    console.log('=== Supabase subscription process completed successfully ===');
    return {
      success: true,
      message: existingSubscription
        ? 'Subscription updated successfully'
        : 'Subscription created successfully',
    };
  } catch (error) {
    console.error('=== Supabase subscription process failed ===');
    console.error('Error details:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        step: 'saving subscription to Supabase',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export async function unsubscribeUser(endpoint?: string) {
  try {
    console.log('=== Starting Supabase unsubscribe process ===');

    if (!endpoint) {
      // Remove all subscriptions if no endpoint specified
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .not('id', 'is', null); // Delete all rows

      if (error) {
        throw new Error(`Failed to remove all subscriptions: ${error.message}`);
      }

      console.log('✓ Removed all subscriptions from Supabase');
      return { success: true, message: 'All subscriptions removed' };
    }

    // Remove specific subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      throw new Error(`Failed to remove subscription: ${error.message}`);
    }

    console.log('✓ Successfully removed subscription from Supabase');
    return { success: true, message: 'Unsubscribed successfully' };
  } catch (error) {
    console.error('✗ Error unsubscribing user from Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendNotification(message: string) {
  try {
    console.log('=== Starting Supabase notification send ===');

    // Get all subscriptions from Supabase
    const { data: subscriptionRows, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptionRows || subscriptionRows.length === 0) {
      console.log('No subscriptions found in Supabase');
      return { success: false, error: 'No subscriptions available' };
    }

    console.log(`Found ${subscriptionRows.length} subscription(s) in Supabase`);

    // Convert database rows to PushSubscription objects
    const subscriptions = subscriptionRows.map(dbRowToPushSubscription);

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: message,
      icon: '/icon.png',
      badge: '/badge.png',
      data: {
        url: '/',
        timestamp: Date.now(),
      },
    });

    console.log('Sending notification payload:', payload);

    // Send notifications to all subscriptions with Apple-specific handling
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription, index) => {
        try {
          console.log(
            `Sending to subscription ${index + 1}/${subscriptions.length}`
          );

          // Check if this is an Apple endpoint
          const isApple = subscription.endpoint.includes('web.push.apple.com');

          if (isApple) {
            // Use Apple-specific options
            const options = {
              vapidDetails: {
                subject: process.env.NEXT_PUBLIC_VAPID_EMAIL!,
                publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
                privateKey: process.env.VAPID_PRIVATE_KEY!,
              },
              TTL: 2419200, // 4 weeks in seconds (Apple requirement)
              headers: {
                'apns-push-type': 'alert',
                'apns-priority': '10',
                'apns-topic': new URL(subscription.endpoint).hostname,
              },
            };

            await webpush.sendNotification(subscription, payload, options);
          } else {
            // Use standard options for other browsers
            await webpush.sendNotification(subscription, payload, {
              TTL: 86400, // 24 hours
            });
          }

          console.log(
            `✓ Successfully sent to subscription ${index + 1} (${
              isApple ? 'Apple' : 'Standard'
            })`
          );
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(
            `✗ Failed to send to subscription ${index + 1}:`,
            error
          );

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(
              `Subscription ${index + 1} expired, removing from Supabase...`
            );
            // await removeExpiredSubscription(subscription.endpoint);
          } else if (
            error.statusCode === 403 &&
            error.body?.includes('BadJwtToken')
          ) {
            console.log(
              `Subscription ${
                index + 1
              } has invalid JWT token, may need VAPID key regeneration`
            );
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `Notification results: ${successful} successful, ${failed} failed out of ${subscriptions.length} total`
    );

    return {
      success: successful > 0,
      sent: successful,
      failed: failed,
      total: subscriptions.length,
      error: successful === 0 ? 'All notifications failed to send' : undefined,
      details:
        failed > 0
          ? 'Some Apple devices may have failed due to VAPID token issues'
          : undefined,
    };
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return {
      success: false,
      error: `Failed to send notification: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

// Helper function to detect Apple endpoints and prepare options
function getNotificationOptions(subscription: PushSubscription) {
  const isApple = subscription.endpoint.includes('web.push.apple.com');

  if (isApple) {
    return {
      vapidDetails: {
        subject: process.env.NEXT_PUBLIC_VAPID_EMAIL!,
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        privateKey: process.env.VAPID_PRIVATE_KEY!,
      },
      TTL: 2419200, // 4 weeks for Apple
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
      },
    };
  }

  return {
    TTL: 86400, // 24 hours for others
  };
}
try {
  const { error } = await supabase.from('push_subscriptions').delete();
  // .eq('endpoint', endpoint);

  if (error) {
    console.error('Failed to remove expired subscription:', error);
  } else {
    console.log('✓ Successfully removed expired subscription from Supabase');
  }
} catch (error) {
  console.error('Error removing expired subscription:', error);
}

export async function getSubscriptionCount() {
  try {
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to get subscription count: ${error.message}`);
    }

    return { count: count || 0, success: true };
  } catch (error) {
    console.error('Error getting subscription count:', error);
    return {
      count: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getSubscriptionDetails() {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }

    return {
      success: true,
      subscriptions:
        subscriptions?.map((sub) => ({
          id: sub.id,
          endpoint: `${sub.endpoint.substring(0, 50)}...`,
          user_agent: sub.user_agent.substring(0, 50) + '...',
          created_at: sub.created_at,
          updated_at: sub.updated_at,
        })) || [],
      total: subscriptions?.length || 0,
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      subscriptions: [],
      total: 0,
    };
  }
}

export async function testSupabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: 'Supabase connection successful',
      details: {
        connected: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: {
        connected: false,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
