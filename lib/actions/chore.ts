// lib/actions/chore.ts
'use server';

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

export async function getChores(): Promise<ChoreWithProfiles[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // First, get the user's household_id
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!userProfile?.household_id) {
    return [];
  }

  // Try PostgREST join syntax first
  let { data, error } = await supabase
    .from('chores')
    .select(
      `
      *,
      assignee:profiles!assigned_to(full_name, email),
      creator:profiles!created_by(full_name, email)
    `
    )
    .eq('household_id', userProfile.household_id)
    .order('created_at', { ascending: false });

  // Fallback to separate queries if joins not available
  if (error && error.message.includes('relationship')) {
    // Get chores for this household
    const { data: choreData, error: choreError } = await supabase
      .from('chores')
      .select('*')
      .eq('household_id', userProfile.household_id)
      .order('created_at', { ascending: false });

    if (choreError) {
      throw new Error(`Failed to load chores: ${choreError.message}`);
    }

    // Get all profiles in the same household
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('household_id', userProfile.household_id);

    if (profileError) {
      throw new Error(`Failed to load profiles: ${profileError.message}`);
    }

    const profileMap = new Map(
      profiles?.map((profile) => [profile.id, profile]) || []
    );

    data = choreData?.map((chore) => ({
      ...chore,
      assignee: chore.assigned_to ? profileMap.get(chore.assigned_to) : null,
      creator: chore.created_by ? profileMap.get(chore.created_by) : null,
    }));
  } else if (error) {
    throw new Error(`Failed to load chores: ${error.message}`);
  }

  return (
    data?.map((chore) => ({
      ...chore,
      assignee_name: chore.assignee?.full_name || 'Unassigned',
      assignee_email: chore.assignee?.email || '',
      creator_name: chore.creator?.full_name || 'Unknown',
      creator_email: chore.creator?.email || '',
    })) || []
  );
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
export async function createChoreAction(formData: FormData) {
  try {
    // Extract and validate form data
    const rawData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      assigned_to: (formData.get('assigned_to') as string) || null,
      due_date: (formData.get('due_date') as string) || null,
      recurring_type: (formData.get('recurring_type') as string) || 'none',
      recurring_interval: formData.get('recurring_interval')
        ? parseInt(formData.get('recurring_interval') as string)
        : null,
      household_id: formData.get('household_id') as string,
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
export async function updateChoreAction(choreId: string, formData: FormData) {
  try {
    // Extract and validate form data
    const rawData = {
      name: (formData.get('name') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      assigned_to: (formData.get('assigned_to') as string) || undefined,
      due_date: (formData.get('due_date') as string) || undefined,
      status: (formData.get('status') as string) || undefined,
      recurring_type: (formData.get('recurring_type') as string) || undefined,
      recurring_interval: formData.get('recurring_interval')
        ? parseInt(formData.get('recurring_interval') as string)
        : undefined,
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
export async function deleteChoreAction(choreId: string) {
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
export async function markChoreCompleteAction(choreId: string) {
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
