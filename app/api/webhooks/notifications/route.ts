// app/api/webhooks/notifications/route.ts
import {
  sendNotificationToHousehold,
  sendNotificationToUser,
} from '@/app/pwa-nextjs/actions';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for server-side operations

const getDeeplinkUrl = (notificationType: string) => {
  switch (notificationType) {
    case 'chore_reminder':
      return '/chores';
    case 'expense_added':
      return '/expenses';
    case 'welcome':
      return '/household';
    case 'webhook_test':
      return '/';
  }
  return '/';
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify webhook secret to ensure request is from Supabase
    const webhookSecret = request.headers.get('x-webhook-secret');

    if (webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('Webhook payload:', payload);

    // Extract notification data from webhook payload
    const { type, table, record, old_record } = payload;

    // Only process INSERT events on notifications table
    if (type !== 'INSERT' || table !== 'notifications') {
      return NextResponse.json(
        { message: 'Event not processed' },
        { status: 200 }
      );
    }

    const notification = record;
    const {
      id,
      user_id,
      household_id,
      title,
      message,
      type: notificationType,
      is_urgent,
      is_read,
    } = notification;

    console.log('Processing notification:', {
      id,
      user_id,
      household_id,
      title,
      notificationType,
    });

    let result;

    // Send push notification to specific user
    if (user_id) {
      console.log('Sending notification to user:', user_id);
      result = await sendNotificationToUser(user_id, title, message, {
        type: notificationType,
        is_urgent,
        notificationId: id,
        url: getDeeplinkUrl(notificationType), // Deep link to notification
      });
    }
    // Send push notification to entire household
    else if (household_id) {
      console.log('Sending notification to household:', household_id);
      result = await sendNotificationToHousehold(household_id, title, message, {
        type: notificationType,
        is_urgent,
        notificationId: id,
        url: getDeeplinkUrl(notificationType),
      });
    } else {
      console.log('No user_id or household_id provided');
      return NextResponse.json(
        {
          message: 'No target user or household specified',
        },
        { status: 400 }
      );
    }

    console.log('Result:', result);

    if (result?.success) {
      console.log(
        `Push notification sent successfully: ${result.sent}/${result.total}`
      );

      console.log('Notification ID:', id);

      // Add this before the update
      const { data: existingRecord, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Existing record:', existingRecord);
      console.log('Fetch error:', fetchError);

      if (!existingRecord) {
        console.log('No record found with ID:', id);
        return NextResponse.json(
          { error: 'Notification record not found' },
          { status: 404 }
        );
      }

      // Optionally update the notification record to mark as pushed
      const { data: updateData, error: updateError } = await supabase
        .from('notifications')
        .update({
          push_sent: true,
          push_sent_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      console.log('Update data:', updateData);

      if (updateError) {
        console.error('Error updating notification:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: `Notification sent to ${result.sent} devices`,
        sent: result.sent,
        total: result.total,
      });
    } else {
      console.error('Failed to send push notification:', result?.error);
      return NextResponse.json(
        {
          success: false,
          error: result?.error || 'Failed to send notification',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
