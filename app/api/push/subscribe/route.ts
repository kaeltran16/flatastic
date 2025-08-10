
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

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

    // Upsert subscription to Supabase
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: request.headers.get('user-agent') || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint'
        }
      );

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    console.log('Subscription saved to Supabase:', subscription.endpoint);

    // Get total count
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully',
      total: count || 0,
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
  const supabase = await createClient();

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptions: subscriptions?.length || 0,
      endpoints: subscriptions?.map((sub) => ({
        endpoint: sub.endpoint.slice(0, 50) + '...',
        created_at: sub.created_at
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { endpoint } = await request.json();

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (error) {
    console.error('Error removing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}