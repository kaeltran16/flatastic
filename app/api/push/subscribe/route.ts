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

    // Save subscription to database
    subscriptions.push(subscription);
    console.log('Subscription saved:', subscription.endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ subscriptions: subscriptions.length });
}
