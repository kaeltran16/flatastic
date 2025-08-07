// app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { subscriptions } = await request.json();

    // Remove subscription from database
    const index = subscriptions.findIndex(
      (sub: any) => sub.endpoint === subscriptions.endpoint
    );
    if (index > -1) {
      subscriptions.splice(index, 1);
      console.log('Subscription removed:', subscriptions.endpoint);
    }

    return NextResponse.json(
      { message: 'Unsubscribed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
