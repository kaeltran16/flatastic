'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { HouseholdInviteData } from '../supabase/types';
export interface HouseholdStats {
  pendingChores: number;
  overdueChores: number;
  balance: number;
  householdMembers: number;
  monthlyExpenses: number;
  choreProgress: { completed: number; total: number };
  userProgress: { completed: number; total: number };
}

export async function getHouseholdStats(): Promise<HouseholdStats> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      pendingChores: 0,
      overdueChores: 0,
      balance: 0,
      householdMembers: 1,
      monthlyExpenses: 0,
      choreProgress: { completed: 0, total: 0 },
      userProgress: { completed: 0, total: 0 },
    };
  }

  // Get user's household ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    return {
      pendingChores: 0,
      overdueChores: 0,
      balance: 0,
      householdMembers: 1,
      monthlyExpenses: 0,
      choreProgress: { completed: 0, total: 0 },
      userProgress: { completed: 0, total: 0 },
    };
  }

  // Get all stats in parallel
  const [
    { data: chores },
    { data: expenses },
    { data: splits },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('chores')
      .select('*')
      .eq('household_id', profile.household_id),

    supabase
      .from('expenses')
      .select('*')
      .eq('household_id', profile.household_id)
      .gte(
        'date',
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString()
      ),

    supabase.from('expense_splits').select('*').eq('user_id', user.id),

    supabase
      .from('profiles')
      .select('id')
      .eq('household_id', profile.household_id),
  ]);

  // Calculate stats
  const pendingChores =
    chores?.filter((c) => c.status === 'pending').length || 0;
  const overdueChores =
    chores?.filter(
      (c) =>
        c.status === 'pending' &&
        c.due_date &&
        new Date(c.due_date) < new Date()
    ).length || 0;

  const monthlyExpenses =
    expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  // Calculate balance (simplified)
  const userOwes =
    splits
      ?.filter((s) => !s.is_settled)
      .reduce((sum, s) => sum + Number(s.amount_owed), 0) || 0;
  const othersOwe =
    expenses
      ?.filter((e) => e.paid_by === user.id)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const balance = othersOwe - userOwes;

  // Calculate chore progress (this week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentChores =
    chores?.filter((c) => new Date(c.created_at) >= weekAgo) || [];
  const choreProgress = {
    completed: recentChores.filter((c) => c.status === 'completed').length,
    total: recentChores.length,
  };

  const userChores = recentChores.filter((c) => c.assigned_to === user.id);
  const userProgress = {
    completed: userChores.filter((c) => c.status === 'completed').length,
    total: userChores.length,
  };

  return {
    pendingChores,
    overdueChores,
    balance,
    householdMembers: members?.length || 1,
    monthlyExpenses,
    choreProgress,
    userProgress,
  };
}

export interface CreateHouseholdData {
  name: string;
}

export interface JoinHouseholdData {
  inviteCode: string;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createHousehold(data: CreateHouseholdData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Check if user is already in a household
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (existingProfile?.household_id) {
    throw new Error('You are already part of a household');
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let codeExists = true;

  while (codeExists) {
    const { data: existing } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!existing) {
      codeExists = false;
    } else {
      inviteCode = generateInviteCode();
    }
  }

  // Create household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name: data.name,
      admin_id: user.id,
      created_by: user.id,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (householdError) {
    throw new Error(`Failed to create household: ${householdError.message}`);
  }

  // Update user's profile to join the household
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ household_id: household.id })
    .eq('id', user.id);

  if (profileError) {
    // Rollback household creation
    await supabase.from('households').delete().eq('id', household.id);
    throw new Error(`Failed to join household: ${profileError.message}`);
  }

  revalidatePath('/household');
  revalidatePath('/dashboard');
  return household;
}

export async function joinHousehold(data: JoinHouseholdData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Check if user is already in a household
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (existingProfile?.household_id) {
    throw new Error('You are already part of a household');
  }

  // Find household by invite code
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name')
    .eq('invite_code', data.inviteCode.toUpperCase())
    .single();

  if (householdError || !household) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  // Update user's profile to join the household
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ household_id: household.id })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(`Failed to join household: ${profileError.message}`);
  }

  // Create a welcome notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    household_id: household.id,
    type: 'welcome',
    title: 'Welcome!',
    message: `You've successfully joined ${household.name}`,
    is_read: false,
    is_urgent: false,
  });

  revalidatePath('/household');
  revalidatePath('/dashboard');
  return household;
}

export async function leaveHousehold() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Get current household info
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    throw new Error('You are not part of any household');
  }

  // Check if user is admin
  const { data: household } = await supabase
    .from('households')
    .select('admin_id')
    .eq('id', profile.household_id)
    .single();

  if (household?.admin_id === user.id) {
    // Check if there are other members
    const { data: members } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', profile.household_id)
      .neq('id', user.id);

    if (members && members.length > 0) {
      throw new Error(
        'Cannot leave household while you are the admin and there are other members. Please transfer admin rights first.'
      );
    }

    // If admin is the only member, delete the household
    await supabase.from('households').delete().eq('id', profile.household_id);
  }

  // Remove user from household
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ household_id: null })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(`Failed to leave household: ${profileError.message}`);
  }

  revalidatePath('/household');
  revalidatePath('/dashboard');
}

export async function updateHouseholdName(householdId: string, name: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Check if user is admin
  const { data: household } = await supabase
    .from('households')
    .select('admin_id')
    .eq('id', householdId)
    .single();

  if (!household || household.admin_id !== user.id) {
    throw new Error('Only household admin can update the name');
  }

  const { error } = await supabase
    .from('households')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', householdId);

  if (error) {
    throw new Error(`Failed to update household name: ${error.message}`);
  }

  revalidatePath('/household');
}

export async function regenerateInviteCode(householdId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Check if user is admin
  const { data: household } = await supabase
    .from('households')
    .select('admin_id')
    .eq('id', householdId)
    .single();

  if (!household || household.admin_id !== user.id) {
    throw new Error('Only household admin can regenerate invite code');
  }

  // Generate new unique invite code
  let inviteCode = generateInviteCode();
  let codeExists = true;

  while (codeExists) {
    const { data: existing } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!existing) {
      codeExists = false;
    } else {
      inviteCode = generateInviteCode();
    }
  }

  const { error } = await supabase
    .from('households')
    .update({
      invite_code: inviteCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', householdId);

  if (error) {
    throw new Error(`Failed to regenerate invite code: ${error.message}`);
  }

  revalidatePath('/household');
  return inviteCode;
}

// Send invitation email (you'll need to implement email service)
export async function inviteHouseholdMember(
  householdId: string,
  inviteData: HouseholdInviteData
): Promise<void> {
  const supabase = await createClient();

  try {
    // Check if user is admin of the household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('admin_id, name, invite_code')
      .eq('id', householdId)
      .single();

    if (householdError) throw householdError;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== household.admin_id) {
      throw new Error('Only household admins can invite members');
    }

    // Check if user with this email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, household_id, email')
      .eq('email', inviteData.email)
      .single();

    if (existingProfile) {
      if (existingProfile.household_id === householdId) {
        throw new Error('User is already a member of this household');
      }
      if (existingProfile.household_id) {
        throw new Error('User is already a member of another household');
      }
    }

    // Create notification for the invited user (if they exist)
    if (existingProfile) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: existingProfile.id,
          household_id: householdId,
          type: 'household_invite',
          title: 'Household Invitation',
          message: `You've been invited to join "${household.name}"${
            inviteData.message ? `. Message: ${inviteData.message}` : ''
          }`,
          is_urgent: true,
        });

      if (notificationError) throw notificationError;
    }

    // TODO: Send email invitation
    // This is where you'd integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just log it
    console.log('Email invitation would be sent to:', inviteData.email);
    console.log('Household:', household.name);
    console.log('Invite code:', household.invite_code);
    console.log('Message:', inviteData.message);

    // In a real implementation, you might want to:
    // 1. Create a pending invitation record
    // 2. Send an email with a link containing the invite code
    // 3. Handle invitation acceptance/rejection
  } catch (error) {
    console.error('Error inviting member:', error);
    throw error;
  }
}

// Join household using invite code
export async function joinHouseholdByCode(inviteCode: string): Promise<void> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Find household by invite code
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (householdError || !household) {
      throw new Error('Invalid invite code');
    }

    // Check if user already has a household
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.household_id) {
      throw new Error('You are already a member of a household');
    }

    // Add user to household
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ household_id: household.id })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Create welcome notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        household_id: household.id,
        type: 'welcome',
        title: 'Welcome to the household!',
        message: `You've successfully joined "${household.name}"`,
      });

    if (notificationError)
      console.error('Error creating welcome notification:', notificationError);
  } catch (error) {
    console.error('Error joining household:', error);
    throw error;
  }
}

// Remove member from household (admin only)
export async function removeHouseholdMember(
  householdId: string,
  memberId: string
): Promise<void> {
  const supabase = await createClient();

  try {
    // Check if current user is admin
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', householdId)
      .single();

    if (householdError) throw householdError;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== household.admin_id) {
      throw new Error('Only household admins can remove members');
    }

    // Cannot remove admin
    if (memberId === household.admin_id) {
      throw new Error('Cannot remove household admin');
    }

    // Remove member from household
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ household_id: null })
      .eq('id', memberId);

    if (updateError) throw updateError;

    // Clean up member's data (optional - you might want to keep some history)
    // Remove pending chores assigned to this member
    const { error: choreError } = await supabase
      .from('chores')
      .update({ assigned_to: null })
      .eq('assigned_to', memberId)
      .eq('household_id', householdId);

    if (choreError) console.error('Error updating chores:', choreError);
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}
