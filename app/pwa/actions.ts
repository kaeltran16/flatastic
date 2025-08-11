'use server';

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import webpush, { PushSubscription } from 'web-push';

// Fixed VAPID configuration
webpush.setVapidDetails(
  `mailto:${process.env.NEXT_PUBLIC_VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const SUBSCRIPTIONS_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(SUBSCRIPTIONS_DIR, 'subscriptions.json');

async function ensureDataDir() {
  if (!existsSync(SUBSCRIPTIONS_DIR)) {
    await mkdir(SUBSCRIPTIONS_DIR, { recursive: true });
  }
}

async function loadSubscriptions(): Promise<PushSubscription[]> {
  try {
    await ensureDataDir();
    if (!existsSync(SUBSCRIPTIONS_FILE)) {
      console.log('No subscriptions file found, returning empty array');
      return [];
    }
    const data = await readFile(SUBSCRIPTIONS_FILE, 'utf-8');
    const subscriptions = JSON.parse(data);
    console.log(`Loaded ${subscriptions.length} subscriptions from file`);
    return subscriptions;
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    return [];
  }
}

async function saveSubscriptions(subscriptions: PushSubscription[]) {
  try {
    await ensureDataDir();
    await writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    console.log(`Saved ${subscriptions.length} subscriptions to file`);
  } catch (error) {
    console.error('Error saving subscriptions:', error);
    throw error;
  }
}

async function removeExpiredSubscription(endpoint: string) {
  try {
    const subscriptions = await loadSubscriptions();
    const filteredSubscriptions = subscriptions.filter(
      (s) => s.endpoint !== endpoint
    );
    await saveSubscriptions(filteredSubscriptions);
    console.log(
      `Removed expired subscription. Remaining: ${filteredSubscriptions.length}`
    );
  } catch (error) {
    console.error('Error removing expired subscription:', error);
  }
}

export async function subscribeUser(sub: PushSubscription) {
  try {
    const subscriptions = await loadSubscriptions();

    // Check if subscription already exists (by endpoint)
    const existingIndex = subscriptions.findIndex(
      (s) => s.endpoint === sub.endpoint
    );

    if (existingIndex >= 0) {
      // Update existing subscription
      subscriptions[existingIndex] = sub;
      console.log('Updated existing subscription');
    } else {
      // Add new subscription
      subscriptions.push(sub);
      console.log('Added new subscription');
    }

    await saveSubscriptions(subscriptions);
    return { success: true, message: 'Subscription saved successfully' };
  } catch (error) {
    console.error('Error subscribing user:', error);
    return { success: false, error: 'Failed to save subscription' };
  }
}

export async function unsubscribeUser(endpoint?: string) {
  try {
    const subscriptions = await loadSubscriptions();

    if (!endpoint) {
      // Remove all subscriptions if no endpoint specified
      await saveSubscriptions([]);
      console.log('Removed all subscriptions');
      return { success: true, message: 'All subscriptions removed' };
    }

    const originalLength = subscriptions.length;
    const filteredSubscriptions = subscriptions.filter(
      (s) => s.endpoint !== endpoint
    );
    await saveSubscriptions(filteredSubscriptions);

    const removed = originalLength - filteredSubscriptions.length;
    console.log(
      `Removed ${removed} subscription(s). Remaining: ${filteredSubscriptions.length}`
    );
    return { success: true, message: 'Unsubscribed successfully' };
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    return { success: false, error: 'Failed to unsubscribe' };
  }
}

export async function sendNotification(message: string) {
  try {
    const subscriptions = await loadSubscriptions();

    console.log(
      `Attempting to send notification to ${subscriptions.length} subscription(s)`
    );

    if (subscriptions.length === 0) {
      console.log('No subscriptions found in storage');
      return { success: false, error: 'No subscriptions available' };
    }

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

    console.log('Sending payload:', payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription, index) => {
        try {
          console.log(
            `Sending to subscription ${index + 1}/${subscriptions.length}`
          );
          await webpush.sendNotification(subscription, payload);
          console.log(`✓ Successfully sent to subscription ${index + 1}`);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(
            `✗ Failed to send to subscription ${index + 1}:`,
            error
          );

          // Handle expired subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Subscription ${index + 1} expired, removing...`);
            await removeExpiredSubscription(subscription.endpoint);
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

export async function getSubscriptionCount() {
  try {
    const subscriptions = await loadSubscriptions();
    return { count: subscriptions.length, success: true };
  } catch (error) {
    console.error('Error getting subscription count:', error);
    return {
      count: 0,
      success: false,
      error: 'Failed to get subscription count',
    };
  }
}
