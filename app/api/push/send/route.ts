import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure web-push with your VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In a real app, get subscriptions from your database
// For demo purposes, we'll use the same array from subscribe route
// This is NOT suitable for production - use a proper database
let subscriptions: SubscriptionData[] = [];

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, icon } = await request.json();

    // Validate VAPID configuration
    if (
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    const notificationPayload = {
      title: title || 'Test Notification',
      body: body || 'This is a test notification',
      icon: icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: url || '/',
      timestamp: Date.now(),
    };

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subscriptions available',
        message: 'Make sure to subscribe to notifications first',
      });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
              },
            },
            JSON.stringify(notificationPayload)
          );
          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          console.error('Failed to send to:', subscription.endpoint, error);
          return { success: false, endpoint: subscription.endpoint, error };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: successful > 0,
      sent: successful,
      failed: failed,
      total: subscriptions.length,
      message: `Sent ${successful}/${subscriptions.length} notifications`,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// Helper function to add subscription (for testing)
export async function PUT(request: NextRequest) {
  try {
    const subscription: SubscriptionData = await request.json();

    // Validate subscription
    if (
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const exists = subscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );
    if (!exists) {
      subscriptions.push(subscription);
    }

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Error adding subscription:', error);
    return NextResponse.json(
      { error: 'Failed to add subscription' },
      { status: 500 }
    );
  }
}
