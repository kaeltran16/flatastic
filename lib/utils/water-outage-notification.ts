import { createSystemClient } from '@/lib/supabase/system';
import type { WaterOutage } from '@/lib/scraping/vietnammoi-scraper';

/**
 * Check if a water outage is relevant to notify users about
 * Only notify for outages happening today, tomorrow, or this weekend
 */
export function isOutageRelevant(outage: WaterOutage): boolean {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Check if outage starts within the next 3 days
  if (outage.startDate <= threeDaysFromNow) {
    return true;
  }

  return false;
}

/**
 * Format water outage information into notification title and message
 */
export function formatOutageMessage(outage: WaterOutage): {
  title: string;
  message: string;
} {
  const title = `💧 Water Outage Alert - ${outage.district}`;

  // Format dates in a readable way
  const startDateStr = outage.startDate.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const endDateStr = outage.endDate.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Build message body
  let message = `Water outage scheduled in ${outage.district} district:\n\n`;
  message += `⏰ From: ${startDateStr}\n`;
  message += `⏰ To: ${endDateStr}\n\n`;

  if (outage.affectedAreas.length > 0) {
    message += `📍 Affected areas:\n`;
    outage.affectedAreas.forEach((area) => {
      message += `• ${area}\n`;
    });
    message += '\n';
  }

  message += `Please prepare in advance.`;

  return { title, message };
}

/**
 * Send water outage notifications to all users in the system
 * Returns count of successful and failed notifications
 */
export async function notifyAllUsersAboutWaterOutage(
  outage: WaterOutage
): Promise<{ sent: number; failed: number }> {
  const supabase = await createSystemClient();

  try {
    // Get all users with households
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, household_id')
      .not('household_id', 'is', null);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No users found to notify');
      return { sent: 0, failed: 0 };
    }

    const { title, message } = formatOutageMessage(outage);

    let sent = 0;
    let failed = 0;

    // Send notification to each user
    for (const profile of profiles) {
      if (!profile.id) {
        console.log('Skipping profile without ID');
        failed++;
        continue;
      }

      try {
        const { error: notifError } = await supabase.rpc(
          'create_notification_with_push',
          {
            p_user_id: profile.id,
            p_household_id: profile.household_id ?? undefined,
            p_title: title,
            p_message: message,
            p_type: 'water_outage',
            p_is_urgent: true,
          }
        );

        if (notifError) {
          console.error(
            `Error sending notification to user ${profile.id}:`,
            notifError
          );
          failed++;
        } else {
          sent++;
        }
      } catch (err: any) {
        console.error(
          `Exception sending notification to user ${profile.id}:`,
          err.message
        );
        failed++;
      }
    }

    console.log(`Water outage notifications: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    console.error('Error in notifyAllUsersAboutWaterOutage:', error.message);
    throw error;
  }
}
