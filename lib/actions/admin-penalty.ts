'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Return type for server actions
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface MemberPenaltySummary {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  totalPenalties: number;
  totalRewards: number;
  netBalance: number;
  penaltyCount: number;
  rewardCount: number;
}

/**
 * Get penalty summary by member for a household
 */
export async function getPenaltySummaryByMember(
  householdId: string
): Promise<ActionResult<MemberPenaltySummary[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user is admin
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', householdId)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Get all household members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('household_id', householdId);

    if (membersError) {
      return { success: false, error: membersError.message };
    }

    // Get all penalties for the household
    const { data: penalties, error: penaltiesError } = await supabase
      .from('fund_penalties')
      .select('user_id, amount')
      .eq('household_id', householdId);

    if (penaltiesError) {
      return { success: false, error: penaltiesError.message };
    }

    // Calculate summaries per member
    const summaries: MemberPenaltySummary[] = (members || []).map((member) => {
      const memberPenalties = penalties?.filter((p) => p.user_id === member.id) || [];
      
      const penaltyItems = memberPenalties.filter((p) => Number(p.amount) > 0);
      const rewardItems = memberPenalties.filter((p) => Number(p.amount) < 0);

      const totalPenalties = penaltyItems.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalRewards = Math.abs(
        rewardItems.reduce((sum, p) => sum + Number(p.amount), 0)
      );

      return {
        userId: member.id,
        userName: member.full_name || member.email.split('@')[0],
        userEmail: member.email,
        avatarUrl: member.avatar_url,
        totalPenalties,
        totalRewards,
        netBalance: totalPenalties - totalRewards,
        penaltyCount: penaltyItems.length,
        rewardCount: rewardItems.length,
      };
    });

    // Sort by net balance (highest first)
    summaries.sort((a, b) => b.netBalance - a.netBalance);

    return {
      success: true,
      data: summaries,
    };
  } catch (error) {
    console.error('Error getting penalty summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a penalty amount (admin only)
 */
export async function updatePenaltyAmount(
  penaltyId: string,
  newAmount: number,
  reason?: string
): Promise<ActionResult<{ penaltyId: string; newAmount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the penalty to check household
    const { data: penalty, error: penaltyError } = await supabase
      .from('fund_penalties')
      .select('household_id, reason, description')
      .eq('id', penaltyId)
      .single();

    if (penaltyError || !penalty) {
      return { success: false, error: 'Penalty not found' };
    }

    // Check if user is admin
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', penalty.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Update the penalty
    const updateData: { amount: number; description?: string; updated_at: string } = {
      amount: newAmount,
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.description = `${penalty.description || ''} [Adjusted: ${reason}]`.trim();
    }

    const { error: updateError } = await supabase
      .from('fund_penalties')
      .update(updateData)
      .eq('id', penaltyId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/penalty-fund');
    revalidatePath('/admin/recurring-chores');

    return {
      success: true,
      data: { penaltyId, newAmount },
    };
  } catch (error) {
    console.error('Error updating penalty amount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get penalty history with optional member filter
 */
export async function getPenaltyHistory(
  householdId: string,
  memberId?: string,
  limit: number = 50
): Promise<
  ActionResult<
    Array<{
      id: string;
      userId: string;
      userName: string;
      amount: number;
      reason: string;
      description: string | null;
      choreName: string | null;
      createdAt: string;
      isReward: boolean;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Build query
    let query = supabase
      .from('fund_penalties')
      .select(`
        id,
        user_id,
        amount,
        reason,
        description,
        created_at,
        profiles!fund_penalties_user_id_fkey(full_name, email),
        chores(name)
      `)
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (memberId) {
      query = query.eq('user_id', memberId);
    }

    const { data: penalties, error: penaltiesError } = await query;

    if (penaltiesError) {
      return { success: false, error: penaltiesError.message };
    }

    const history = penalties?.map((penalty: any) => ({
      id: penalty.id,
      userId: penalty.user_id,
      userName: penalty.profiles?.full_name || penalty.profiles?.email || 'Unknown',
      amount: Math.abs(Number(penalty.amount)),
      reason: penalty.reason,
      description: penalty.description,
      choreName: penalty.chores?.name || null,
      createdAt: penalty.created_at,
      isReward: Number(penalty.amount) < 0,
    }));

    return {
      success: true,
      data: history || [],
    };
  } catch (error) {
    console.error('Error getting penalty history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a penalty (admin only)
 */
export async function deletePenalty(
  penaltyId: string
): Promise<ActionResult<{ penaltyId: string }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the penalty to check household
    const { data: penalty, error: penaltyError } = await supabase
      .from('fund_penalties')
      .select('household_id')
      .eq('id', penaltyId)
      .single();

    if (penaltyError || !penalty) {
      return { success: false, error: 'Penalty not found' };
    }

    // Check if user is admin
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', penalty.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Delete the penalty
    const { error: deleteError } = await supabase
      .from('fund_penalties')
      .delete()
      .eq('id', penaltyId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    revalidatePath('/penalty-fund');
    revalidatePath('/admin/recurring-chores');

    return {
      success: true,
      data: { penaltyId },
    };
  } catch (error) {
    console.error('Error deleting penalty:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
