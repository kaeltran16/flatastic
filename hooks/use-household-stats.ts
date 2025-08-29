// hooks/useHouseholdStats.ts - Refactored with best practices
import type { HouseholdStats } from '@/lib/actions/household';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from './use-profile';

// Fetch function for household stats
async function fetchHouseholdStats(
  householdId: string,
  userId: string
): Promise<HouseholdStats> {
  const supabase = createClient();

  // Get all stats in parallel
  const [
    { data: chores },
    { data: expenses },
    { data: userOwedSplits },
    { data: othersOweSplits },
    { data: members },
  ] = await Promise.all([
    supabase.from('chores').select('*').eq('household_id', householdId),

    supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .gte(
        'date',
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString()
      ),

    // What current user owes to others
    supabase
      .from('expense_splits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_settled', false),

    // What others owe to current user
    supabase
      .from('expense_splits')
      .select('*, expense:expenses!inner(paid_by)')
      .eq('expense.paid_by', userId)
      .neq('user_id', userId)
      .eq('is_settled', false),

    supabase.from('profiles').select('id').eq('household_id', householdId),
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

  // Calculate balance correctly
  const userOwes =
    userOwedSplits?.reduce((sum, s) => sum + Number(s.amount_owed), 0) || 0;

  const othersOwe =
    othersOweSplits?.reduce((sum, s) => sum + Number(s.amount_owed), 0) || 0;

  const balance = othersOwe - userOwes;

  // Calculate chore progress (this week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentChores =
    chores?.filter((c) => c.created_at && new Date(c.created_at) >= weekAgo) ||
    [];

  const choreProgress = {
    completed: recentChores.filter((c) => c.status === 'completed').length,
    total: recentChores.length,
  };

  const userChores = recentChores.filter((c) => c.assigned_to === userId);
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

export function useHouseholdStats() {
  const {
    profile: currentUser,
    loading: profileLoading,
    error: profileError,
  } = useProfile();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: queryKeys.stats.household(currentUser?.household_id!),
    queryFn: () =>
      fetchHouseholdStats(currentUser!.household_id!, currentUser!.id),
    enabled: !!currentUser?.household_id,
    staleTime: 1 * 60 * 1000, // 1 minute - stats change frequently
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const loading = profileLoading || statsLoading;
  const error = profileError || statsError;

  return {
    stats: stats || {
      pendingChores: 0,
      overdueChores: 0,
      balance: 0,
      householdMembers: 1,
      monthlyExpenses: 0,
      choreProgress: { completed: 0, total: 0 },
      userProgress: { completed: 0, total: 0 },
    },
    loading,
    error: error?.message || null,
  };
}
