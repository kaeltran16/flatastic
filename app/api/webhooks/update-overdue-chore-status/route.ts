import { createSystemClient } from '@/lib/supabase/system';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (!webhookSecret || !process.env.SUPABASE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSystemClient();

    // Simple UTC timestamp - no external dependencies needed
    const now = new Date().toISOString();

    const { count, error } = await supabase
      .from('chores')
      .update({
        status: 'overdue',
        updated_at: now,
      })
      .eq('status', 'pending')
      .lt('due_date', now);

    if (error) throw error;

    return Response.json({
      success: true,
      updated: count || 0,
      timestamp: now,
      timezone: 'UTC',
    });
  } catch (error: any) {
    console.error('Error updating overdue tasks:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
