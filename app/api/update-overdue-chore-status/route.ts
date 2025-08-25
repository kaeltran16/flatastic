import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

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
