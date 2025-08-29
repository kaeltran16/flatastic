import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Get current time in GMT+7 (Asia/Ho_Chi_Minh timezone)
    const now =
      new Date()
        .toLocaleString('sv-SE', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })
        .replace(' ', 'T') + '.000Z';

    // Calculate end of today (11:59:59 PM GMT+7)
    const nowGMT7 = new Date(now);
    const endOfToday = new Date(nowGMT7);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();

    // Find chores that expire today (due before end of today)
    const { data: choresExpiringToday, error: choreError } = await supabase
      .from('chores')
      .select(
        `
        id,
        name,
        description,
        due_date,
        assigned_to,
        household_id,
        profiles!chores_assigned_to_fkey(full_name, email)
      `
      )
      .eq('status', 'pending')
      .lte('due_date', endOfTodayISO)
      .gte('due_date', now) // Not already overdue
      .not('assigned_to', 'is', null);

    if (choreError) throw choreError;

    let notificationsSent = 0;

    // Send notifications for chores expiring today
    if (choresExpiringToday && choresExpiringToday.length > 0) {
      for (const chore of choresExpiringToday) {
        const dueDate = new Date(chore.due_date!);
        const dueTime = dueDate.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Ho_Chi_Minh',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        if (!chore.assigned_to) {
          console.log('No assigned to found for chore', chore.id);
          continue;
        }
        const { error: notifError } = await supabase.rpc(
          'create_notification_with_push',
          {
            p_user_id: chore.assigned_to,
            p_household_id: chore.household_id,
            p_title: '⏰ Chore Expiring Today',
            p_message: `"${chore.name}" expires today at ${dueTime}. Please complete it before it's overdue!`,
            p_type: 'chore_expiring',
            p_is_urgent: true,
          }
        );

        if (notifError) {
          console.error('Error sending expiration notification:', notifError);
        } else {
          notificationsSent++;
        }
      }
    }

    return Response.json({
      success: true,
      notifications_sent: notificationsSent,
      chores_expiring_today: choresExpiringToday?.length || 0,
      timestamp: now,
      timezone: 'GMT+7 (Asia/Ho_Chi_Minh)',
      scheduled_time: '8:00 PM GMT+7',
    });
  } catch (error: any) {
    console.error('Error sending chore expiration reminders:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
