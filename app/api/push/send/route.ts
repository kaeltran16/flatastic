import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// In a real app, get subscriptions from your database
let subscriptions: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, icon } = await request.json();

    const notificationPayload = {
      title,
      body,
      icon: icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      url: url || '/',
    };

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subscriptions available',
      });
    }

    const promises = subscriptions.map((subscription) => {
      return webpush.sendNotification(
        subscription,
        JSON.stringify(notificationPayload)
      );
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      sent: subscriptions.length,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
