'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Return type for server actions
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ChoreAuditEntry {
  id: string;
  name: string;
  status: string;
  assigneeName: string;
  assigneeId: string | null;
  templateName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  createdByName: string;
}

interface TemplatePerformanceStats {
  templateId: string;
  templateName: string;
  totalChores: number;
  completedChores: number;
  overdueChores: number;
  pendingChores: number;
  completionRate: number;
  avgCompletionTime: number | null; // in hours
}

/**
 * Bulk complete multiple chores (admin only)
 */
export async function bulkCompleteChores(
  choreIds: string[]
): Promise<ActionResult<{ completedCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's profile to check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (!profile?.household_id) {
      return { success: false, error: 'User not in a household' };
    }

    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', profile.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Update all chores to completed
    const { error: updateError, data } = await supabase
      .from('chores')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .in('id', choreIds)
      .eq('household_id', profile.household_id)
      .select();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/chores');
    revalidatePath('/admin/recurring-chores');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { completedCount: data?.length || 0 },
    };
  } catch (error) {
    console.error('Error bulk completing chores:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk reassign multiple chores to a new user (admin only)
 */
export async function bulkReassignChores(
  choreIds: string[],
  assignToUserId: string
): Promise<ActionResult<{ reassignedCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (!profile?.household_id) {
      return { success: false, error: 'User not in a household' };
    }

    // Check admin status
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', profile.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Verify the target user is in the same household
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', assignToUserId)
      .single();

    if (targetUser?.household_id !== profile.household_id) {
      return { success: false, error: 'Target user not in the same household' };
    }

    // Update all chores
    const { error: updateError, data } = await supabase
      .from('chores')
      .update({
        assigned_to: assignToUserId,
        updated_at: new Date().toISOString(),
      })
      .in('id', choreIds)
      .eq('household_id', profile.household_id)
      .select();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/chores');
    revalidatePath('/admin/recurring-chores');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { reassignedCount: data?.length || 0 },
    };
  } catch (error) {
    console.error('Error bulk reassigning chores:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Admin override to directly assign a chore to any user
 */
export async function adminOverrideAssignment(
  choreId: string,
  userId: string
): Promise<ActionResult<{ choreId: string; assignedTo: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the chore to check household
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('household_id')
      .eq('id', choreId)
      .single();

    if (choreError || !chore) {
      return { success: false, error: 'Chore not found' };
    }

    // Check admin status
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', chore.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Verify target user is in household
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('household_id, full_name')
      .eq('id', userId)
      .single();

    if (targetUser?.household_id !== chore.household_id) {
      return { success: false, error: 'User not in the same household' };
    }

    // Update the chore
    const { error: updateError } = await supabase
      .from('chores')
      .update({
        assigned_to: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', choreId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/chores');
    revalidatePath('/admin/recurring-chores');

    return {
      success: true,
      data: { choreId, assignedTo: targetUser?.full_name || userId },
    };
  } catch (error) {
    console.error('Error overriding chore assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get chore audit log - full history of chore activity
 */
export async function getChoreAuditLog(
  householdId: string,
  limit: number = 50
): Promise<ActionResult<ChoreAuditEntry[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get chores with related data
    const { data: chores, error: choresError } = await supabase
      .from('chores')
      .select(`
        id,
        name,
        status,
        assigned_to,
        due_date,
        updated_at,
        created_at,
        template_id,
        assignee:profiles!chores_assigned_to_fkey(full_name, email),
        creator:profiles!chores_created_by_fkey(full_name, email),
        chore_templates(name)
      `)
      .eq('household_id', householdId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (choresError) {
      return { success: false, error: choresError.message };
    }

    const auditLog: ChoreAuditEntry[] = (chores || []).map((chore: any) => ({
      id: chore.id,
      name: chore.name,
      status: chore.status || 'pending',
      assigneeName: chore.assignee?.full_name || chore.assignee?.email || 'Unassigned',
      assigneeId: chore.assigned_to,
      templateName: chore.chore_templates?.name || null,
      dueDate: chore.due_date,
      completedAt: chore.status === 'completed' ? chore.updated_at : null,
      createdAt: chore.created_at,
      createdByName: chore.creator?.full_name || chore.creator?.email || 'Unknown',
    }));

    return {
      success: true,
      data: auditLog,
    };
  } catch (error) {
    console.error('Error getting chore audit log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get template performance statistics
 */
export async function getTemplatePerformanceStats(
  householdId: string
): Promise<ActionResult<TemplatePerformanceStats[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get all templates
    const { data: templates, error: templatesError } = await supabase
      .from('chore_templates')
      .select('id, name')
      .eq('household_id', householdId)
      .eq('is_active', true);

    if (templatesError) {
      return { success: false, error: templatesError.message };
    }

    // Get all chores with template_id
    const { data: chores, error: choresError } = await supabase
      .from('chores')
      .select('id, status, template_id, due_date, created_at, updated_at')
      .eq('household_id', householdId)
      .not('template_id', 'is', null);

    if (choresError) {
      return { success: false, error: choresError.message };
    }

    // Calculate stats per template
    const stats: TemplatePerformanceStats[] = (templates || []).map((template) => {
      const templateChores = chores?.filter((c) => c.template_id === template.id) || [];
      const total = templateChores.length;
      const completed = templateChores.filter((c) => c.status === 'completed').length;
      const overdue = templateChores.filter((c) => c.status === 'overdue').length;
      const pending = templateChores.filter((c) => c.status === 'pending').length;

      // Calculate average completion time for completed chores
      let avgCompletionTime: number | null = null;
      const completedChores = templateChores.filter((c) => c.status === 'completed');
      if (completedChores.length > 0) {
        const totalHours = completedChores.reduce((sum, chore) => {
          const created = chore.created_at ? new Date(chore.created_at).getTime() : Date.now();
          const updated = chore.updated_at ? new Date(chore.updated_at).getTime() : Date.now();
          return sum + (updated - created) / (1000 * 60 * 60); // hours
        }, 0);
        avgCompletionTime = Math.round((totalHours / completedChores.length) * 10) / 10;
      }

      return {
        templateId: template.id,
        templateName: template.name,
        totalChores: total,
        completedChores: completed,
        overdueChores: overdue,
        pendingChores: pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgCompletionTime,
      };
    });

    // Sort by overdue count (highest first) to highlight problematic templates
    stats.sort((a, b) => b.overdueChores - a.overdueChores);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('Error getting template performance stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all pending and overdue chores for admin management
 */
export async function getAdminChoresList(
  householdId: string
): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      assigneeId: string | null;
      assigneeName: string;
      dueDate: string | null;
      templateName: string | null;
      isOverdue: boolean;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get pending and overdue chores
    const { data: chores, error: choresError } = await supabase
      .from('chores')
      .select(`
        id,
        name,
        description,
        status,
        assigned_to,
        due_date,
        template_id,
        assignee:profiles!chores_assigned_to_fkey(full_name, email),
        chore_templates(name)
      `)
      .eq('household_id', householdId)
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true });

    if (choresError) {
      return { success: false, error: choresError.message };
    }

    const now = new Date();
    const choresList = (chores || []).map((chore: any) => ({
      id: chore.id,
      name: chore.name,
      description: chore.description,
      status: chore.status || 'pending',
      assigneeId: chore.assigned_to,
      assigneeName: chore.assignee?.full_name || chore.assignee?.email || 'Unassigned',
      dueDate: chore.due_date,
      templateName: chore.chore_templates?.name || null,
      isOverdue: chore.due_date ? new Date(chore.due_date) < now : false,
    }));

    return {
      success: true,
      data: choresList,
    };
  } catch (error) {
    console.error('Error getting admin chores list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
