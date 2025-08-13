'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { Chore } from '../supabase/schema.alias';
import { ChoreWithProfiles } from '../supabase/types';

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

export async function addChore(input: Chore) {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Validate that user belongs to the household
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to verify user profile: ${profileError.message}`);
  }

  if (userProfile.household_id !== input.household_id) {
    throw new Error('User does not belong to this household');
  }

  // Prepare chore data for insertion
  const choreData: Chore = {
    id: uuidv4(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    assigned_to: input.assigned_to || null,
    due_date: input.due_date || null,
    recurring_type: input.recurring_type || 'none',
    recurring_interval: input.recurring_interval || null,
    household_id: input.household_id,
    created_by: user.id,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Insert the chore
  const { data: newChore, error: insertError } = await supabase
    .from('chores')
    .insert(choreData)
    .select(
      `
      *,
      assignee:profiles!assigned_to(full_name, email),
      creator:profiles!created_by(full_name, email)
    `
    )
    .single();

  if (insertError) {
    // Fallback to basic insert if joins not available
    if (insertError.message.includes('relationship')) {
      const { data: basicChore, error: basicError } = await supabase
        .from('chores')
        .insert(choreData)
        .select('*')
        .single();

      if (basicError) {
        throw new Error(`Failed to create chore: ${basicError.message}`);
      }

      // Get profile information separately
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in(
          'id',
          [basicChore.assigned_to, basicChore.created_by].filter(Boolean)
        );

      if (profileError) {
        console.warn('Failed to load profiles for new chore:', profileError);
      }

      const profileMap = new Map(
        profiles?.map((profile) => [profile.id, profile]) || []
      );

      const choreWithProfiles = {
        ...basicChore,
        assignee: profileMap.get(basicChore.assigned_to),
        creator: profileMap.get(basicChore.created_by),
        assignee_name:
          profileMap.get(basicChore.assigned_to)?.full_name || 'Unassigned',
        assignee_email: profileMap.get(basicChore.assigned_to)?.email || '',
        creator_name:
          profileMap.get(basicChore.created_by)?.full_name || 'Unknown',
        creator_email: profileMap.get(basicChore.created_by)?.email || '',
      };

      // Revalidate the chores page to show the new chore
      revalidatePath('/chores');

      return choreWithProfiles;
    } else {
      throw new Error(`Failed to create chore: ${insertError.message}`);
    }
  }

  // Format the response with profile names for consistency
  const formattedChore = {
    ...newChore,
    assignee_name: newChore.assignee?.full_name || 'Unassigned',
    assignee_email: newChore.assignee?.email || '',
    creator_name: newChore.creator?.full_name || 'Unknown',
    creator_email: newChore.creator?.email || '',
  };

  // Revalidate the chores page to show the new chore
  revalidatePath('/chores');

  return formattedChore;
}
