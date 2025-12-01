// lib/actions/chore.ts
'use server';

import { ChoreFormData } from '@/hooks/use-chore';
import { ChoreInsert, ChoreUpdate } from '@/lib/supabase/schema.alias';
import { createClient } from '@/lib/supabase/server';
import { CreateChoreSchema, UpdateChoreSchema } from '@/lib/validations/chore';
import { calculateNextCreationDate } from '@/lib/validations/chore-template';
import { revalidatePath } from 'next/cache';

// Custom error class for chore operations
class ChoreActionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ChoreActionError';
  }
}

// Helper function to get authenticated user and household
async function getAuthenticatedUserWithHousehold() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new ChoreActionError(
      `Authentication failed: ${authError.message}`,
      'AUTH_ERROR'
    );
  }

  if (!user) {
    throw new ChoreActionError('User not authenticated', 'NO_USER');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new ChoreActionError(
      `Failed to get user profile: ${profileError.message}`,
      'PROFILE_ERROR'
    );
  }

  if (!userProfile.household_id) {
    throw new ChoreActionError(
      'User is not part of any household',
      'NO_HOUSEHOLD'
    );
  }

  return { user, userProfile, supabase };
}

// Server action to create a chore
export async function createChore(formData: ChoreFormData) {
  try {
    // Extract and validate form data
    const rawData = {
      name: formData.name,
      description: formData.description,
      assigned_to: formData.assigned_to,
      due_date: formData.due_date,
      recurring_type: formData.recurring_type || 'none',
      recurring_interval: formData.recurring_interval,
      household_id: formData.household_id,
    };

    // Validate input
    const validatedData = CreateChoreSchema.parse(rawData);

    const { user, userProfile, supabase } =
      await getAuthenticatedUserWithHousehold();

    // Verify user belongs to the housdehold
    if (userProfile.household_id !== validatedData.household_id) {
      throw new ChoreActionError(
        'User does not belong to this household',
        'UNAUTHORIZED'
      );
    }

    // Prepare chore data for insert (exclude auto-generated fields)
    const choreData: ChoreInsert = {
      ...validatedData,
      created_by: user.id,
      status: 'pending' as const,
      household_id: validatedData.household_id,
      // Don't include id, created_at, updated_at - let the database handle these
    };

    // Insert chore
    const { data: newChore, error: insertError } = await supabase
      .from('chores')
      .insert(choreData)
      .select('*')
      .single();

    if (insertError) {
      throw new ChoreActionError(
        `Failed to create chore: ${insertError.message}`,
        'INSERT_ERROR'
      );
    }

    revalidatePath('/chores');
    return { success: true, data: newChore };
  } catch (error) {
    console.error('Create chore error:', error);

    if (error instanceof ChoreActionError) {
      return { success: false, error: error.message, code: error.code };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chore',
      code: 'UNKNOWN_ERROR',
    };
  }
}

// Server action to update a chore
export async function updateChore(choreId: string, formData: ChoreFormData) {
  try {
    // Extract and validate form data
    const rawData = {
      name: formData.name || undefined,
      description: formData.description || undefined,
      assigned_to: formData.assigned_to || undefined,
      due_date: formData.due_date || undefined,
      status: formData.status || undefined,
      recurring_type: formData.recurring_type || undefined,
      recurring_interval: formData.recurring_interval || undefined,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(rawData).filter(([_, value]) => value !== undefined)
    );

    // Validate input
    const validatedData = UpdateChoreSchema.parse(cleanedData);

    const { user, userProfile, supabase } =
      await getAuthenticatedUserWithHousehold();

    // Check if chore exists and user has permission
    const { data: existingChore, error: fetchError } = await supabase
      .from('chores')
      .select('household_id, template_id')
      .eq('id', choreId)
      .single();

    if (fetchError) {
      throw new ChoreActionError('Chore not found', 'NOT_FOUND');
    }

    if (existingChore.household_id !== userProfile.household_id) {
      throw new ChoreActionError(
        'Not authorized to update this chore',
        'UNAUTHORIZED'
      );
    }

    // Update chore
    const updateData: Partial<ChoreUpdate> = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update(updateData)
      .eq('id', choreId)
      .select('*')
      .single();

    if (updateError) {
      throw new ChoreActionError(
        `Failed to update chore: ${updateError.message}`,
        'UPDATE_ERROR'
      );
    }

    // If due_date is being updated, check if we need to update the template's schedule
    if (validatedData.due_date && existingChore.template_id) {
      // Check if this is the latest chore for this template
      const { data: latestChore } = await supabase
        .from('chores')
        .select('id')
        .eq('template_id', existingChore.template_id)
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

      if (latestChore && latestChore.id === choreId) {
        // This is the latest chore, so we should update the template's next_creation_date
        const { data: template } = await supabase
          .from('chore_templates')
          .select('recurring_type, recurring_interval')
          .eq('id', existingChore.template_id)
          .single();

        if (template && template.recurring_type && template.recurring_interval) {
          const nextDate = calculateNextCreationDate(
            validatedData.due_date,
            template.recurring_type,
            template.recurring_interval
          );

          await supabase
            .from('chore_templates')
            .update({
              next_creation_date: nextDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingChore.template_id);
        }
      }
    }

    revalidatePath('/chores');
    return { success: true, data: updatedChore };
  } catch (error) {
    console.error('Update chore error:', error);

    if (error instanceof ChoreActionError) {
      return { success: false, error: error.message, code: error.code };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update chore',
      code: 'UNKNOWN_ERROR',
    };
  }
}

// Server action to delete a chore
export async function deleteChore(choreId: string) {
  try {
    const { user, userProfile, supabase } =
      await getAuthenticatedUserWithHousehold();

    // Check if chore exists and user has permission
    const { data: existingChore, error: fetchError } = await supabase
      .from('chores')
      .select('household_id, template_id, due_date')
      .eq('id', choreId)
      .single();

    if (fetchError) {
      throw new ChoreActionError('Chore not found', 'NOT_FOUND');
    }

    if (existingChore.household_id !== userProfile.household_id) {
      throw new ChoreActionError(
        'Not authorized to delete this chore',
        'UNAUTHORIZED'
      );
    }

    // Check if we need to reconcile template schedule
    if (existingChore.template_id) {
      // Check if this is the latest chore for this template
      const { data: latestChore } = await supabase
        .from('chores')
        .select('id')
        .eq('template_id', existingChore.template_id)
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

      if (latestChore && latestChore.id === choreId) {
        // We are deleting the latest chore.
        // We should reset the template's next_creation_date to this chore's due_date
        // so it gets recreated (or the schedule resumes from here)
        if (existingChore.due_date) {
           await supabase
            .from('chore_templates')
            .update({
              next_creation_date: existingChore.due_date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingChore.template_id);
        }
      }
    }

    // Delete chore
    const { error: deleteError } = await supabase
      .from('chores')
      .delete()
      .eq('id', choreId);

    if (deleteError) {
      throw new ChoreActionError(
        `Failed to delete chore: ${deleteError.message}`,
        'DELETE_ERROR'
      );
    }

    revalidatePath('/chores');
    return { success: true };
  } catch (error) {
    console.error('Delete chore error:', error);

    if (error instanceof ChoreActionError) {
      return { success: false, error: error.message, code: error.code };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chore',
      code: 'UNKNOWN_ERROR',
    };
  }
}

// Server action to mark chore as complete
export async function markChoreComplete(choreId: string) {
  try {
    const { user, userProfile, supabase } =
      await getAuthenticatedUserWithHousehold();

    // Check if chore exists and user has permission
    const { data: existingChore, error: fetchError } = await supabase
      .from('chores')
      .select('household_id, status')
      .eq('id', choreId)
      .single();

    if (fetchError) {
      throw new ChoreActionError('Chore not found', 'NOT_FOUND');
    }

    if (existingChore.household_id !== userProfile.household_id) {
      throw new ChoreActionError(
        'Not authorized to update this chore',
        'UNAUTHORIZED'
      );
    }

    if (existingChore.status === 'completed') {
      throw new ChoreActionError(
        'Chore is already completed',
        'ALREADY_COMPLETED'
      );
    }

    // Mark as complete
    const updateData: Partial<ChoreUpdate> = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update(updateData)
      .eq('id', choreId)
      .select('*')
      .single();

    if (updateError) {
      throw new ChoreActionError(
        `Failed to mark chore complete: ${updateError.message}`,
        'UPDATE_ERROR'
      );
    }

    revalidatePath('/chores');
    return { success: true, data: updatedChore };
  } catch (error) {
    console.error('Mark complete error:', error);

    if (error instanceof ChoreActionError) {
      return { success: false, error: error.message, code: error.code };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to mark chore complete',
      code: 'UNKNOWN_ERROR',
    };
  }
}


export async function sendChoreReminders(householdId: string) {
  try {
    const supabase = await createClient();

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfToday = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    // get chores due today
    const { data: choresToday, error: choreError } = await supabase
      .from('chores')
      .select(
        `
        id,
        name,
        due_date,
        assigned_to
      `
      )
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .gte('due_date', startOfToday)
      .lte('due_date', endOfToday)
      .not('assigned_to', 'is', null);

    if (choreError) throw choreError;

    let notificationsSent = 0;

    // send reminder for each chore
    if (choresToday && choresToday.length > 0) {
      for (const chore of choresToday) {
        const dueDate = new Date(chore.due_date!);
        const dueTime = dueDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const { error: notifError } = await supabase.rpc(
          'create_notification_with_push',
          {
            p_user_id: chore.assigned_to || undefined,
            p_household_id: householdId,
            p_title: '📋 Chore Due Today',
            p_message: `"${chore.name}" is due today at ${dueTime}. Don't forget to complete it!`,
            p_type: 'chore_reminder',
            p_is_urgent: false,
          }
        );

        if (!notifError) {
          notificationsSent++;
        }
      }
    }

    return {
      success: true,
      notificationsSent,
      choresDueToday: choresToday?.length || 0,
    };
  } catch (error) {
    console.error('Error sending reminders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}