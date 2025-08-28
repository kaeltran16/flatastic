// lib/actions/chore.ts
'use server';

import { ChoreFormData } from '@/hooks/use-chore';
import { createClient } from '@/lib/supabase/server';
import { CreateChoreSchema, UpdateChoreSchema } from '@/lib/validations/chore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

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

    // Verify user belongs to the household
    if (userProfile.household_id !== validatedData.household_id) {
      throw new ChoreActionError(
        'User does not belong to this household',
        'UNAUTHORIZED'
      );
    }

    // Prepare chore data
    const choreData = {
      ...validatedData,
      id: uuidv4(),
      created_by: user.id,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      .select('household_id')
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
    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', choreId)
      .select('*')
      .single();

    if (updateError) {
      throw new ChoreActionError(
        `Failed to update chore: ${updateError.message}`,
        'UPDATE_ERROR'
      );
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
      .select('household_id')
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
    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
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
