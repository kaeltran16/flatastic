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
  assigned_to: z.string().uuid().optional().nullable(), // Allow manual override
  recurring: z
    .object({
      type: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1).max(365),
    })
    .optional(),
});

export async function getNextUserInRotation(
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

    // Get household settings for rotation order
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('chore_rotation_order')
      .eq('id', householdId)
      .single();

    // Sort users based on custom order if available
    let sortedUsers = [...availableUsers];
    if (household?.chore_rotation_order && Array.isArray(household.chore_rotation_order)) {
      const orderMap = new Map(
        household.chore_rotation_order.map((id: string, index: number) => [id, index])
      );
      
      sortedUsers.sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
        
        if (indexA !== indexB) {
          return indexA - indexB;
        }
        // Fallback to created_at for users not in the order list (or both new)
        return 0; // Stable sort preserves original created_at order from query
      });
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
      nextUserId = sortedUsers[0].id;

      // Create tracking record
      await supabase.from('template_assignment_tracker').insert({
        template_id: templateId,
        household_id: householdId,
        last_assigned_user_id: nextUserId,
        assignment_order: sortedUsers.map((u) => u.id),
        updated_at: new Date().toISOString(),
      });

      return nextUserId;
    }

    // Find current user index in sorted users
    const currentUserIndex = sortedUsers.findIndex(
      (user) => user.id === assignmentTracker.last_assigned_user_id
    );

    if (currentUserIndex === -1) {
      // Last assigned user not available anymore, start from beginning
      nextUserId = sortedUsers[0].id;
    } else {
      // Get next user in rotation (circular)
      const nextUserIndex = (currentUserIndex + 1) % sortedUsers.length;
      nextUserId = sortedUsers[nextUserIndex].id;
    }

    // Update tracking record
    await supabase
      .from('template_assignment_tracker')
      .update({
        last_assigned_user_id: nextUserId,
        assignment_order: sortedUsers.map((u) => u.id),
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
    const { template_id, household_id, due_date, recurring, assigned_to } = validatedData;

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

    let assignedUserId = assigned_to || undefined;

    // If no manual override, get next user in rotation
    // If no manual override, get next user in rotation
    if (!assignedUserId) {
      const nextUser = await getNextUserInRotation(
        household_id,
        template_id
      );
      assignedUserId = nextUser || undefined;
    } else {
      // If manual override, we should still update the tracker so rotation continues from here
      // But we need to be careful not to break if the user is not in the rotation list
      // For now, let's just update the tracker blindly if they exist
       await supabase
      .from('template_assignment_tracker')
      .upsert({
        template_id: template_id,
        household_id: household_id,
        last_assigned_user_id: assignedUserId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'template_id,household_id' });
    }

    if (!assignedUserId) {
      throw new ChoreActionError(
        'No available users found for assignment',
        'NO_AVAILABLE_USERS'
      );
    }

    // The due_date is already calculated in GMT+7 timezone with 23:59:59
    // from the calling function (webhook or manual trigger)
    // We should NOT modify it here as it would use local timezone
    const calculatedDueDate = due_date;

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
