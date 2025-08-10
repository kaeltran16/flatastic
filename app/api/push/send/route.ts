import { createClient } from '@/lib/supabase/server';
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();

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

    // Fetch all subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subscriptions available',
        message: 'Make sure to subscribe to notifications first',
      });
    }

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(notificationPayload)
          );
          return { success: true, endpoint: subscription.endpoint };
        } catch (error) {
          console.error('Failed to send to:', subscription.endpoint, error);
          
          // If subscription is invalid, remove it from database
          if (error && (error as any).statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
            console.log('Removed invalid subscription:', subscription.endpoint);
          }
          
          return { success: false, endpoint: subscription.endpoint, error };
        }
      })
    );

    const successful = results.filter(
      (r: any) => r.status === 'fulfilled' && r.value.success
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