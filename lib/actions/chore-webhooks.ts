import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ChoreInsert } from '../supabase/schema.alias';
import { createSystemClient } from '../supabase/system';

export class ChoreActionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ChoreActionError';
  }
}

const AutoCreateChoreSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  household_id: z.string().uuid('Invalid household ID'),
  due_date: z.string().optional(),
  recurring: z
    .object({
      type: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1).max(365),
    })
    .optional(),
});

async function getNextUserInRotation(
  householdId: string,
  templateId: string
): Promise<string | null> {
  try {
    const supabase = await createSystemClient();
    // Get all available users in the household
    const { data: availableUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, is_available')
      .eq('household_id', householdId)
      .eq('is_available', true)
      .order('created_at'); // Consistent ordering

    if (usersError || !availableUsers?.length) {
      console.error('No available users found:', usersError);
      return null;
    }

    // Get or create assignment tracking record for this template
    const { data: assignmentTracker, error: trackerError } = await supabase
      .from('template_assignment_tracker')
      .select('last_assigned_user_id, assignment_order')
      .eq('template_id', templateId)
      .eq('household_id', householdId)
      .single();

    let nextUserId: string;

    if (trackerError || !assignmentTracker) {
      // No tracking record exists, start with first available user
      nextUserId = availableUsers[0].id;

      // Create tracking record
      await supabase.from('template_assignment_tracker').insert({
        template_id: templateId,
        household_id: householdId,
        last_assigned_user_id: nextUserId,
        assignment_order: availableUsers.map((u: { id: string }) => u.id),
        updated_at: new Date().toISOString(),
      });

      return nextUserId;
    }

    // Find current user index in available users
    const currentUserIndex = availableUsers.findIndex(
      (user: { id: string }) =>
        user.id === assignmentTracker.last_assigned_user_id
    );

    if (currentUserIndex === -1) {
      // Last assigned user not available anymore, start from beginning
      nextUserId = availableUsers[0].id;
    } else {
      // Get next user in rotation (circular)
      const nextUserIndex = (currentUserIndex + 1) % availableUsers.length;
      nextUserId = availableUsers[nextUserIndex].id;
    }

    // Update tracking record
    await supabase
      .from('template_assignment_tracker')
      .update({
        last_assigned_user_id: nextUserId,
        assignment_order: availableUsers.map((u: { id: string }) => u.id),
        updated_at: new Date().toISOString(),
      })
      .eq('template_id', templateId)
      .eq('household_id', householdId);

    return nextUserId;
  } catch (error) {
    console.error('Error getting next user in rotation:', error);
    return null;
  }
}

/**
 * Server action to automatically create a chore from a template with sequential assignment
 */
export async function autoCreateChoreFromTemplate(request: ChoreInsert) {
  try {
    const supabase = await createSystemClient();
    // Validate input
    const validatedData = AutoCreateChoreSchema.parse(request);
    const { template_id, household_id, due_date, recurring } = validatedData;

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('chore_templates')
      .select('*')
      .eq('id', template_id)
      .or(`household_id.is.null,household_id.eq.${household_id}`)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      throw new ChoreActionError(
        'Template not found or inactive',
        'TEMPLATE_NOT_FOUND'
      );
    }

    // Verify template belongs to the household
    if (
      template.household_id !== null &&
      template.household_id !== household_id
    ) {
      throw new ChoreActionError(
        'Template does not belong to this household',
        'TEMPLATE_UNAUTHORIZED'
      );
    }

    const { data: householdAdmin, error: householdAdminError } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', household_id)
      .single();

    if (!householdAdmin || householdAdminError) {
      throw new ChoreActionError(
        'Household admin not found',
        'HOUSEHOLD_ADMIN_NOT_FOUND'
      );
    }

    // Get next user in rotation
    const assignedUserId = await getNextUserInRotation(
      household_id,
      template_id
    );

    if (!assignedUserId) {
      throw new ChoreActionError(
        'No available users found for assignment',
        'NO_AVAILABLE_USERS'
      );
    }

    // Calculate due date
    let calculatedDueDate = due_date;
    if (!calculatedDueDate && recurring) {
      const now = new Date();
      switch (recurring.type) {
        case 'daily':
          now.setDate(now.getDate() + recurring.interval);
          break;
        case 'weekly':
          now.setDate(now.getDate() + recurring.interval * 7);
          break;
        case 'monthly':
          now.setMonth(now.getMonth() + recurring.interval);
          break;
      }
      calculatedDueDate = now.toISOString().split('T')[0];
    }

    // Create the chore
    const { data: newChore, error: choreError } = await supabase
      .from('chores')
      .insert({
        name: template.name,
        description: template.description,
        household_id: household_id,
        assigned_to: assignedUserId,
        created_by: householdAdmin.admin_id,
        due_date: calculatedDueDate,
        recurring_type: recurring?.type || null,
        recurring_interval: recurring?.interval || null,
        status: 'pending',
        template_id: template_id,
      })
      .select('id, name, assigned_to, due_date')
      .single();

    if (choreError || !newChore) {
      throw new ChoreActionError(
        `Failed to create chore: ${choreError?.message}`,
        'CREATE_FAILED'
      );
    }

    // Get assigned user's name
    const { data: assignedUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedUserId)
      .single();

    revalidatePath('/chores');
    revalidatePath('/templates');

    return {
      success: true,
      chore: {
        id: newChore.id,
        name: newChore.name,
        assigned_to: newChore.assigned_to,
        assigned_user_name: assignedUser?.full_name || 'Unknown',
        due_date: newChore.due_date,
      },
    };
  } catch (error) {
    console.error('Auto-create chore error:', error);

    if (error instanceof ChoreActionError) {
      return { success: false, error: error.message, code: error.code };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to auto-create chore',
      code: 'UNKNOWN_ERROR',
    };
  }
}
