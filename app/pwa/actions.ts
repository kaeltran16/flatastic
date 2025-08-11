// @ts-nocheck
// Enhanced actions.js with detailed debugging
'use server';

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!
);

// Configure VAPID
webpush.setVapidDetails(
  process.env.NEXT_PUBLIC_VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Debug function
function debugLog(message, data = null) {
  console.log(`[SERVER DEBUG] ${new Date().toISOString()}: ${message}`);
  if (data) {
    console.log('[SERVER DEBUG DATA]:', JSON.stringify(data, null, 2));
  }
}

// Helper function to convert database row to PushSubscription object
function dbRowToPushSubscription(row) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

// Helper function to extract auth and p256dh from subscription
function extractSubscriptionKeys(sub) {
  let authKey;
  let p256dhKey;

  if (sub.keys) {
    authKey =
      typeof sub.keys.auth === 'string'
        ? sub.keys.auth
        : Buffer.from(sub.keys.auth).toString('base64');
    p256dhKey =
      typeof sub.keys.p256dh === 'string'
        ? sub.keys.p256dh
        : Buffer.from(sub.keys.p256dh).toString('base64');
  } else if (sub.getKey) {
    const authBuffer = sub.getKey('auth');
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

export async function subscribeUser(sub) {
  try {
    debugLog('Starting subscription process');

    if (!sub.endpoint) {
      throw new Error('Invalid subscription: missing endpoint');
    }

    const { authKey, p256dhKey } = extractSubscriptionKeys(sub);
    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-side';

    debugLog('Subscription details', {
      endpoint: `${sub.endpoint.substring(0, 50)}...`,
      hasAuth: !!authKey,
      hasP256dh: !!p256dhKey,
    });

    const { data: existingSubscription, error: checkError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', sub.endpoint)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
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
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (updateError) {
        throw new Error(
          `Failed to update subscription: ${updateError.message}`
        );
      }
      debugLog('Updated existing subscription');
    } else {
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert([subscriptionData]);

      if (insertError) {
        throw new Error(
          `Failed to create subscription: ${insertError.message}`
        );
      }
      debugLog('Created new subscription');
    }

    return {
      success: true,
      message: existingSubscription
        ? 'Subscription updated successfully'
        : 'Subscription created successfully',
    };
  } catch (error) {
    debugLog('Subscription failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function unsubscribeUser(endpoint) {
  try {
    debugLog('Starting unsubscribe process');

    if (!endpoint) {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .not('id', 'is', null);

      if (error) {
        throw new Error(`Failed to remove all subscriptions: ${error.message}`);
      }
      debugLog('Removed all subscriptions');
      return { success: true, message: 'All subscriptions removed' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      throw new Error(`Failed to remove subscription: ${error.message}`);
    }

    debugLog('Successfully removed subscription');
    return { success: true, message: 'Unsubscribed successfully' };
  } catch (error) {
    debugLog('Unsubscribe failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendNotification(message) {
  try {
    debugLog('=== Starting notification send process ===');
    debugLog('Message to send', { message });

    // Get all subscriptions
    const { data: subscriptionRows, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptionRows || subscriptionRows.length === 0) {
      debugLog('No subscriptions found');
      return { success: false, error: 'No subscriptions available' };
    }

    debugLog(`Found ${subscriptionRows.length} subscription(s)`);

    // Convert to PushSubscription objects
    const subscriptions = subscriptionRows.map(dbRowToPushSubscription);

    // Create payload - THIS IS CRITICAL
    const payload = JSON.stringify({
      title: 'Test Notification',
      body: message,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        url: '/',
        timestamp: Date.now(),
        messageId: `msg-${Date.now()}`,
      },
      tag: `notification-${Date.now()}`,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      silent: false,
    });

    debugLog('Notification payload created', JSON.parse(payload));

    // Validate VAPID configuration
    const vapidConfig = {
      email: process.env.NEXT_PUBLIC_VAPID_EMAIL,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY ? '[REDACTED]' : 'MISSING',
    };
    debugLog('VAPID configuration', vapidConfig);

    if (
      !process.env.NEXT_PUBLIC_VAPID_EMAIL ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY
    ) {
      throw new Error('Missing VAPID configuration');
    }

    // Send to each subscription with detailed logging
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription, index) => {
        try {
          debugLog(
            `Sending to subscription ${index + 1}/${subscriptions.length}`,
            {
              endpoint: `${subscription.endpoint.substring(0, 50)}...`,
              hasKeys: !!(
                subscription.keys &&
                subscription.keys.auth &&
                subscription.keys.p256dh
              ),
            }
          );

          // Validate subscription format
          if (!subscription.endpoint) {
            throw new Error('Missing endpoint');
          }
          if (
            !subscription.keys ||
            !subscription.keys.auth ||
            !subscription.keys.p256dh
          ) {
            throw new Error('Missing encryption keys');
          }

          const isApple = subscription.endpoint.includes('web.push.apple.com');
          debugLog(`Subscription type: ${isApple ? 'Apple' : 'Standard'}`);

          const options = {
            vapidDetails: {
              subject: process.env.NEXT_PUBLIC_VAPID_EMAIL!,
              publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
              privateKey: process.env.VAPID_PRIVATE_KEY!,
            },
            TTL: isApple ? 2419200 : 86400,
            ...(isApple && {
              headers: {
                'apns-push-type': 'alert',
                'apns-priority': '10',
                'apns-topic': new URL(subscription.endpoint).hostname,
              },
            }),
          };

          debugLog(`Sending with options`, {
            TTL: options.TTL,
            hasHeaders: !!options.headers,
            isApple,
          });

          // CRITICAL: Log the exact data being sent
          debugLog('About to call webpush.sendNotification with:', {
            subscriptionEndpoint: `${subscription.endpoint.substring(
              0,
              50
            )}...`,
            payloadLength: payload.length,
            optionsKeys: Object.keys(options),
          });

          const result = await webpush.sendNotification(
            subscription,
            payload,
            options
          );

          debugLog(`✅ Successfully sent to subscription ${index + 1}`, {
            statusCode: result.statusCode,
            headers: result.headers,
          });

          return {
            success: true,
            endpoint: subscription.endpoint,
            statusCode: result.statusCode,
          };
        } catch (error) {
          debugLog(`❌ Failed to send to subscription ${index + 1}`, {
            error: error.message,
            statusCode: error.statusCode,
            body: error.body,
            headers: error.headers,
            stack: error.stack,
          });

          // Handle specific error codes
          if (error.statusCode === 410 || error.statusCode === 404) {
            debugLog(`Subscription ${index + 1} expired (${error.statusCode})`);
          } else if (error.statusCode === 403) {
            debugLog(
              `Subscription ${index + 1} forbidden (${
                error.statusCode
              }) - possible VAPID issue`
            );
          } else if (error.statusCode === 400) {
            debugLog(
              `Bad request (${error.statusCode}) - possible payload issue`
            );
          }

          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    debugLog(`Final results: ${successful} successful, ${failed} failed`);

    // Log failed attempts details
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        debugLog(`Failed attempt ${index + 1} details:`, {
          reason: result.reason?.message,
          statusCode: result.reason?.statusCode,
          body: result.reason?.body,
        });
      }
    });

    debugLog('=== Notification send process completed ===');

    return {
      success: successful > 0,
      sent: successful,
      failed: failed,
      total: subscriptions.length,
      error: successful === 0 ? 'All notifications failed to send' : undefined,
      details:
        failed > 0
          ? 'Some notifications failed - check server logs'
          : undefined,
    };
  } catch (error) {
    debugLog('Critical error in sendNotification', {
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: `Failed to send notification: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

// Add a test function to validate the entire flow
export async function testNotificationFlow(message = 'Test notification flow') {
  debugLog('=== TESTING NOTIFICATION FLOW ===');

  try {
    // 1. Check VAPID configuration
    debugLog('1. Checking VAPID configuration...');
    const hasVapidEmail = !!process.env.NEXT_PUBLIC_VAPID_EMAIL;
    const hasVapidPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY;

    debugLog('VAPID check results', {
      hasVapidEmail,
      hasVapidPublic,
      hasVapidPrivate,
      emailPreview:
        process.env.NEXT_PUBLIC_VAPID_EMAIL?.substring(0, 10) + '...',
      publicKeyPreview:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20) + '...',
    });

    if (!hasVapidEmail || !hasVapidPublic || !hasVapidPrivate) {
      throw new Error('Missing VAPID configuration');
    }

    // 2. Check Supabase connection
    debugLog('2. Testing Supabase connection...');
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    debugLog('✅ Supabase connection successful');

    // 3. Get subscriptions
    debugLog('3. Fetching subscriptions...');
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    debugLog(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return {
        success: false,
        error: 'No subscriptions available for testing',
        details: 'Subscribe to push notifications first',
      };
    }

    // 4. Test payload creation
    debugLog('4. Creating test payload...');
    const testPayload = JSON.stringify({
      title: 'Flow Test',
      body: message,
      icon: '/icon-192x192.png',
      data: { test: true, timestamp: Date.now() },
      tag: 'flow-test',
    });

    debugLog('Test payload created', JSON.parse(testPayload));

    // 5. Send test notification
    debugLog('5. Sending test notification...');
    const result = await sendNotification(message);

    debugLog('=== TEST COMPLETED ===', result);
    return result;
  } catch (error) {
    debugLog('=== TEST FAILED ===', {
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: `Test failed: ${error.message}`,
      details: 'Check server logs for detailed error information',
    };
  }
}
