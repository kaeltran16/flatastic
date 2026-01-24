import { createSystemClient } from '@/lib/supabase/system';
import { getLatestBinhThanhWaterOutage } from '@/lib/scraping/vietnammoi-scraper';
import {
  isOutageRelevant,
  notifyAllUsersAboutWaterOutage,
} from '@/lib/utils/water-outage-notification';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Verify webhook secret to ensure request is authorized
    const webhookSecret = request.headers.get('x-webhook-secret');

    if (!webhookSecret || !process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use timing-safe comparison to prevent timing attacks
    const isValidSecret = crypto.timingSafeEqual(
      Buffer.from(webhookSecret),
      Buffer.from(process.env.SUPABASE_WEBHOOK_SECRET)
    );

    if (!isValidSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system Supabase client
    const supabase = await createSystemClient();

    const now = new Date();
    const nowISO = now.toISOString();

    console.log('Water outage check webhook triggered at:', nowISO);

    // Scrape latest Binh Thanh water outage data
    const outage = await getLatestBinhThanhWaterOutage();

    if (!outage) {
      console.log('No water outage found for Binh Thanh district');
      return NextResponse.json({
        success: true,
        timestamp: nowISO,
        timezone: 'Asia/Ho_Chi_Minh',
        outage_found: false,
        outage_relevant: false,
        notifications_sent: 0,
        notifications_failed: 0,
      });
    }

    console.log('Water outage found:', {
      district: outage.district,
      timeRange: outage.timeRange,
      startDate: outage.startDate.toISOString(),
      endDate: outage.endDate.toISOString(),
    });

    // Check if outage is relevant (today, tomorrow, or this weekend)
    const relevant = isOutageRelevant(outage);

    if (!relevant) {
      console.log('Water outage is not relevant (too far in the future)');
      return NextResponse.json({
        success: true,
        timestamp: nowISO,
        timezone: 'Asia/Ho_Chi_Minh',
        outage_found: true,
        outage_relevant: false,
        notifications_sent: 0,
        notifications_failed: 0,
        outage_details: {
          district: outage.district,
          timeRange: outage.timeRange,
          startDate: outage.startDate.toISOString(),
          endDate: outage.endDate.toISOString(),
          affectedAreasCount: outage.affectedAreas.length,
        },
      });
    }

    // Notify all users about the water outage
    console.log('Sending water outage notifications to all users...');
    const { sent, failed } = await notifyAllUsersAboutWaterOutage(outage);

    console.log(
      `Water outage notifications complete: ${sent} sent, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      timestamp: nowISO,
      timezone: 'Asia/Ho_Chi_Minh',
      outage_found: true,
      outage_relevant: true,
      notifications_sent: sent,
      notifications_failed: failed,
      outage_details: {
        district: outage.district,
        timeRange: outage.timeRange,
        startDate: outage.startDate.toISOString(),
        endDate: outage.endDate.toISOString(),
        affectedAreas: outage.affectedAreas,
      },
    });
  } catch (error: any) {
    console.error('Error in water outage check webhook:', error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
