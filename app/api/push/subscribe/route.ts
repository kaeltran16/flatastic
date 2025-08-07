// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In a real app, save subscriptions to your database
const subscriptions: SubscriptionData[] = [];

export async function POST(request: NextRequest) {
  try {
    const subscription: SubscriptionData = await request.json();

    // Validate subscription data
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

    // Check if subscription already exists
    const existingIndex = subscriptions.findIndex(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      // Update existing subscription
      subscriptions[existingIndex] = subscription;
    } else {
      // Add new subscription
      subscriptions.push(subscription);
    }

    console.log('Subscription saved:', subscription.endpoint);

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    subscriptions: subscriptions.length,
    endpoints: subscriptions.map((sub) => sub.endpoint.slice(0, 50) + '...'),
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    const index = subscriptions.findIndex((sub) => sub.endpoint === endpoint);
    if (index >= 0) {
      subscriptions.splice(index, 1);
      return NextResponse.json({
        success: true,
        message: 'Subscription removed',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Subscription not found',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
