'use server';

import { createClient } from '@/lib/supabase/server';
import type { ChoreWithProfiles } from '@/lib/supabase/types';
export async function getChores(): Promise<ChoreWithProfiles[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    .order('created_at', { ascending: false });

  // Fallback to separate queries if joins not available
  if (error && error.message.includes('relationship')) {
    const { data: choreData, error: choreError } = await supabase
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false });

    if (choreError) {
      throw new Error(`Failed to load chores: ${choreError.message}`);
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (profileError) {
      throw new Error(`Failed to load profiles: ${profileError.message}`);
    }

    const profileMap = new Map(
      profiles?.map((profile) => [profile.id, profile]) || []
    );

    data = choreData?.map((chore) => ({
      ...chore,
      assignee: profileMap.get(chore.assigned_to),
      creator: profileMap.get(chore.created_by),
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
