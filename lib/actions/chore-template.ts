'use server';

import {
    ChoreTemplate,
    ChoreTemplateInsert,
    ChoreTemplateUpdate,
} from '@/lib/supabase/schema.alias';
import { createClient } from '@/lib/supabase/server';
import { TZDate } from '@date-fns/tz';
import { endOfDay, startOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';

/**
 * Create a new chore template
 */
export async function createChoreTemplate(
  templateData: ChoreTemplateInsert
): Promise<ChoreTemplate> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to create chore template');
  }

  // Get user's profile to access household_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }

  // Validate required fields
  if (!templateData.name?.trim()) {
    throw new Error('Chore template name is required');
  }

  // Prepare insert data
  const insertData: any = {
    name: templateData.name.trim(),
    description: templateData.description?.trim() || null,
    is_custom: true,
    is_active: true,
    household_id: templateData.household_id || profile.household_id,
    created_by: user.id,
  };

  // Add recurring configuration if provided
  if (templateData.is_recurring !== undefined) {
    insertData.is_recurring = templateData.is_recurring;
  }
  if (templateData.recurring_type !== undefined) {
    insertData.recurring_type = templateData.recurring_type;
  }
  if (templateData.recurring_interval !== undefined) {
    insertData.recurring_interval = templateData.recurring_interval;
  }
  if (templateData.recurring_start_date !== undefined) {
    insertData.recurring_start_date = templateData.recurring_start_date;
    // Calculate initial next_creation_date if recurring is enabled
    if (templateData.is_recurring && templateData.recurring_type && templateData.recurring_interval && templateData.recurring_start_date) {
      const startDate = new Date(templateData.recurring_start_date);
      insertData.next_creation_date = startDate.toISOString();
    }
  }
  if (templateData.auto_assign_rotation !== undefined) {
    insertData.auto_assign_rotation = templateData.auto_assign_rotation;
  }

  // Insert the new template
  const { data: newTemplate, error: insertError } = await supabase
    .from('chore_templates')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('Error creating chore template:', insertError);
    throw new Error(`Failed to create chore template: ${insertError.message}`);
  }

  // Revalidate relevant paths
  revalidatePath('/chores');
  revalidatePath('/chores/rotation');

  return newTemplate as ChoreTemplate;
}

/**
 * Update an existing chore template
 */
export async function updateChoreTemplate(
  templateData: ChoreTemplateUpdate
): Promise<ChoreTemplate> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to update chore template');
  }

  // Validate required fields
  if (!templateData.id) {
    throw new Error('Template ID is required for updates');
  }

  // Prepare update data (only include fields that are provided)
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (templateData.name !== undefined) {
    if (!templateData.name?.trim()) {
      throw new Error('Chore template name cannot be empty');
    }
    updateData.name = templateData.name.trim();
  }

  if (templateData.description !== undefined) {
    updateData.description = templateData.description?.trim() || null;
  }

  if (templateData.is_active !== undefined) {
    updateData.is_active = templateData.is_active;
  }

  // Add recurring configuration updates
  if (templateData.is_recurring !== undefined) {
    updateData.is_recurring = templateData.is_recurring;
  }
  if (templateData.recurring_type !== undefined) {
    updateData.recurring_type = templateData.recurring_type;
  }
  if (templateData.recurring_interval !== undefined) {
    updateData.recurring_interval = templateData.recurring_interval;
  }
  if (templateData.recurring_start_date !== undefined) {
    updateData.recurring_start_date = templateData.recurring_start_date;
  }
  if (templateData.auto_assign_rotation !== undefined) {
    updateData.auto_assign_rotation = templateData.auto_assign_rotation;
  }
  if (templateData.next_creation_date !== undefined) {
    updateData.next_creation_date = templateData.next_creation_date;
  }
  if (templateData.last_created_at !== undefined) {
    updateData.last_created_at = templateData.last_created_at;
  }

  // Update the template
  const { data: updatedTemplate, error: updateError } = await supabase
    .from('chore_templates')
    .update(updateData)
    .eq('id', templateData.id)
    .eq('created_by', user.id) // Ensure user can only update their own templates
    .select()
    .single();

  if (updateError) {
    console.error('Error updating chore template:', updateError);
    throw new Error(`Failed to update chore template: ${updateError.message}`);
  }

  if (!updatedTemplate) {
    throw new Error(
      'Template not found or you do not have permission to update it'
    );
  }

  // Revalidate relevant paths
  revalidatePath('/chores');
  revalidatePath('/chores/rotation');

  return updatedTemplate as ChoreTemplate;
}

/**
 * Delete a chore template (soft delete by setting is_active to false)
 */
export async function deleteChoreTemplate(templateId: string): Promise<void> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to delete chore template');
  }

  if (!templateId) {
    throw new Error('Template ID is required for deletion');
  }

  // Soft delete by setting is_active to false
  const { error: deleteError } = await supabase
    .from('chore_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('created_by', user.id); // Ensure user can only delete their own templates

  if (deleteError) {
    console.error('Error deleting chore template:', deleteError);
    throw new Error(`Failed to delete chore template: ${deleteError.message}`);
  }

  // Revalidate relevant paths
  revalidatePath('/chores');
  revalidatePath('/chores/rotation');
}

/**
 * Get all active chore templates for the user's household
 */
export async function getChoreTemplates(): Promise<ChoreTemplate[]> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to fetch chore templates');
  }

  // Get user's profile to access household_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }

  // Fetch global templates + household-specific custom templates
  const { data: templates, error: templatesError } = await supabase
    .from('chore_templates')
    .select('*')
    .eq('is_active', true)
    .or(`household_id.is.null,household_id.eq.${profile.household_id}`)
    .order('is_custom', { ascending: true }) // Global templates first
    .order('name');

  if (templatesError) {
    console.error('Error fetching chore templates:', templatesError);
    throw new Error(
      `Failed to fetch chore templates: ${templatesError.message}`
    );
  }

  return templates as ChoreTemplate[];
}

/**
 * Get a specific chore template by ID
 */
export async function getChoreTemplateById(
  templateId: string
): Promise<ChoreTemplate | null> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to fetch chore template');
  }

  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // Get user's profile to access household_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }

  // Fetch the specific template (must be global or belong to user's household)
  const { data: template, error: templateError } = await supabase
    .from('chore_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .or(`household_id.is.null,household_id.eq.${profile.household_id}`)
    .single();

  if (templateError) {
    if (templateError.code === 'PGRST116') {
      return null; // Template not found
    }
    console.error('Error fetching chore template:', templateError);
    throw new Error(`Failed to fetch chore template: ${templateError.message}`);
  }

  return template as ChoreTemplate;
}

/**
 * Duplicate an existing template (useful for creating variations)
 */
export async function duplicateChoreTemplate(
  templateId: string,
  newName?: string
): Promise<ChoreTemplate> {
  const supabase = await createClient();

  // Get the original template
  const originalTemplate = await getChoreTemplateById(templateId);
  if (!originalTemplate) {
    throw new Error('Template not found');
  }

  // Create a new template based on the original
  const duplicateData: ChoreTemplateInsert = {
    name: newName || `${originalTemplate.name} (Copy)`,
    description: originalTemplate.description,
  };

  return await createChoreTemplate(duplicateData);
}

/**
 * Batch create multiple chore templates
 */
export async function createMultipleChoreTemplates(
  templates: ChoreTemplateInsert[]
): Promise<ChoreTemplate[]> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('Authentication required to create chore templates');
  }

  // Get user's profile to access household_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }

  // Validate and prepare insert data
  const insertData = templates.map((template) => {
    if (!template.name?.trim()) {
      throw new Error('All chore template names are required');
    }

    return {
      name: template.name.trim(),
      description: template.description?.trim() || null,
      is_custom: true,
      is_active: true,
      household_id: template.household_id || profile.household_id,
      created_by: user.id,
    };
  });

  // Insert all templates
  const { data: newTemplates, error: insertError } = await supabase
    .from('chore_templates')
    .insert(insertData)
    .select();

  if (insertError) {
    console.error('Error creating chore templates:', insertError);
    throw new Error(`Failed to create chore templates: ${insertError.message}`);
  }

  // Revalidate relevant paths
  revalidatePath('/chores');
  revalidatePath('/chores/rotation');

  return newTemplates as ChoreTemplate[];
}

/**
 * Get the next user who will be assigned a chore from a template
 */
export async function getNextAssignedUser(
  templateId: string
): Promise<{ userId: string; userName: string } | null> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    // Get user's profile to check household
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.household_id) {
      return null;
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('chore_templates')
      .select('*')
      .eq('id', templateId)
      .eq('household_id', profile.household_id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return null;
    }

    // Get all available users in the household
    const { data: availableUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, is_available')
      .eq('household_id', profile.household_id)
      .eq('is_available', true)
      .order('created_at');

    if (usersError || !availableUsers?.length) {
      return null;
    }

    // Get assignment tracking record for this template
    const { data: assignmentTracker, error: trackerError } = await supabase
      .from('template_assignment_tracker')
      .select('last_assigned_user_id, assignment_order')
      .eq('template_id', templateId)
      .eq('household_id', profile.household_id)
      .single();

    let nextUserId: string;

    if (trackerError || !assignmentTracker) {
      // No tracking record exists, next will be first available user
      nextUserId = availableUsers[0].id;
    } else {
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
    }

    // Get the user's name
    const nextUser = availableUsers.find((u: { id: string }) => u.id === nextUserId);
    if (!nextUser) {
      return null;
    }

    return {
      userId: nextUserId,
      userName: nextUser.full_name || 'Unknown',
    };
  } catch (error) {
    console.error('Error getting next assigned user:', error);
    return null;
  }
}

/**
 * Get the next due date for a chore from a template
 */
export async function getNextDueDate(templateId: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    // Get user's profile to check household
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.household_id) {
      return null;
    }

    // Get the most recent chore created from this template
    const { data: lastChore } = await supabase
      .from('chores')
      .select('created_at')
      .eq('template_id', templateId)
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const TIMEZONE = 'Asia/Ho_Chi_Minh';
    const now = new Date();

    // Get current time in GMT+7
    const nowGMT7 = new TZDate(now, TIMEZONE);
    const todayStartGMT7 = startOfDay(nowGMT7);

    let dueDateGMT7: TZDate;

    if (lastChore && lastChore.created_at) {
      // Convert last chore creation time to GMT+7
      const lastCreatedGMT7 = new TZDate(lastChore.created_at, TIMEZONE);
      const lastCreatedStartGMT7 = startOfDay(lastCreatedGMT7);

      // If last chore was created today (in GMT+7), set due date to tomorrow
      if (lastCreatedStartGMT7.getTime() === todayStartGMT7.getTime()) {
        // Tomorrow at end of day in GMT+7
        const tomorrowGMT7 = new TZDate(
          nowGMT7.getTime() + 24 * 60 * 60 * 1000,
          TIMEZONE
        );
        dueDateGMT7 = endOfDay(tomorrowGMT7) as TZDate;
      } else {
        // Last chore was in the past, set due date to end of today in GMT+7
        dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
      }
    } else {
      // No previous chore exists, set due date to end of today in GMT+7
      dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
    }

    return dueDateGMT7.toISOString();
  } catch (error) {
    console.error('Error getting next due date:', error);
    return null;
  }
}

/**
 * Manually trigger chore creation from a template (for rotation chores)
 * This bypasses the automated webhook and allows admins to create chores on-demand
 */
export async function manuallyTriggerChoreCreation(
  templateId: string,
  dueDate?: string
): Promise<{ success: boolean; chore?: any; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's profile to check household and admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.household_id) {
      return { success: false, error: 'User profile or household not found' };
    }

    // Verify user is admin of the household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', profile.household_id)
      .single();

    if (householdError || !household) {
      return { success: false, error: 'Household not found' };
    }

    if (household.admin_id !== user.id) {
      return {
        success: false,
        error: 'Only household admin can manually trigger chore creation',
      };
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('chore_templates')
      .select('*')
      .eq('id', templateId)
      .eq('household_id', profile.household_id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      return { success: false, error: 'Template not found or inactive' };
    }

    // Import and use the autoCreateChoreFromTemplate function
    const { autoCreateChoreFromTemplate } = await import('./chore-webhooks');

    // Prepare the data for chore creation
    const choreData: any = {
      template_id: templateId,
      household_id: profile.household_id,
      name: template.name,
    };

    // Smart due date logic: check last created chore from this template
    const TIMEZONE = 'Asia/Ho_Chi_Minh';

    if (dueDate) {
      // If due date is provided, ensure it's set to end of day in GMT+7
      const providedDateGMT7 = new TZDate(dueDate, TIMEZONE);
      const dueDateGMT7 = endOfDay(providedDateGMT7) as TZDate;
      choreData.due_date = dueDateGMT7.toISOString();
    } else {
      // Get the most recent chore created from this template
      const { data: lastChore } = await supabase
        .from('chores')
        .select('created_at')
        .eq('template_id', templateId)
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const now = new Date();

      // Get current time in GMT+7
      const nowGMT7 = new TZDate(now, TIMEZONE);
      const todayStartGMT7 = startOfDay(nowGMT7);

      let dueDateGMT7: TZDate;

      if (lastChore && lastChore.created_at) {
        // Convert last chore creation time to GMT+7
        const lastCreatedGMT7 = new TZDate(lastChore.created_at, TIMEZONE);
        const lastCreatedStartGMT7 = startOfDay(lastCreatedGMT7);

        // If last chore was created today (in GMT+7), set due date to tomorrow
        if (lastCreatedStartGMT7.getTime() === todayStartGMT7.getTime()) {
          // Tomorrow at end of day in GMT+7
          const tomorrowGMT7 = new TZDate(
            nowGMT7.getTime() + 24 * 60 * 60 * 1000,
            TIMEZONE
          );
          dueDateGMT7 = endOfDay(tomorrowGMT7) as TZDate;
        } else {
          // Last chore was in the past, set due date to end of today in GMT+7
          dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
        }
      } else {
        // No previous chore exists, set due date to end of today in GMT+7
        dueDateGMT7 = endOfDay(nowGMT7) as TZDate;
      }

      choreData.due_date = dueDateGMT7.toISOString();
    }

    // Add recurring configuration if available (but don't use it for due date calculation)
    if (template.recurring_type && template.recurring_interval) {
      choreData.recurring = {
        type: template.recurring_type,
        interval: template.recurring_interval,
      };
    }

    // Create the chore
    const result = await autoCreateChoreFromTemplate(choreData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create chore',
      };
    }

    // Revalidate paths
    revalidatePath('/chores');
    revalidatePath('/dashboard');
    revalidatePath('/admin/recurring-chores');

    return { success: true, chore: result.chore };
  } catch (error) {
    console.error('Error manually triggering chore creation:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create chore',
    };
  }
}
