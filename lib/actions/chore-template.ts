'use server';

import {
  ChoreTemplate,
  ChoreTemplateInsert,
  ChoreTemplateUpdate,
} from '@/lib/supabase/schema.alias';
import { createClient } from '@/lib/supabase/server';
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
  const insertData = {
    name: templateData.name.trim(),
    description: templateData.description?.trim() || null,
    is_custom: true,
    is_active: true,
    household_id: templateData.household_id || profile.household_id,
    created_by: user.id,
  };

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
