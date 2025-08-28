'use client';
import type { HouseholdStats } from '@/lib/actions/household';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Query key factory
export const householdKeys = {
  all: ['household'] as const,
  stats: () => [...householdKeys.all, 'stats'] as const,
  chores: () => [...householdKeys.all, 'chores'] as const,
  expenses: () => [...householdKeys.all, 'expenses'] as const,
};

// Fetch function using your exact server logic
async function fetchHouseholdStats(): Promise<HouseholdStats> {
  const supabase = createClient();

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

  // Get all stats in parallel (your exact implementation)
  const [
    { data: chores },
    { data: expenses },
    { data: userOwedSplits },
    { data: othersOweSplits },
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

    // What current user owes to others
    supabase
      .from('expense_splits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_settled', false),

    // What others owe to current user (splits for expenses they paid)
    supabase
      .from('expense_splits')
      .select('*, expense:expenses!inner(paid_by)')
      .eq('expense.paid_by', user.id)
      .neq('user_id', user.id)
      .eq('is_settled', false),

    supabase
      .from('profiles')
      .select('id')
      .eq('household_id', profile.household_id),
  ]);

  // Calculate stats (your exact logic)
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

  // Calculate balance CORRECTLY
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

// Custom hook
export function useHouseholdStats() {
  return useQuery({
    queryKey: householdKeys.stats(),
    queryFn: fetchHouseholdStats,
    staleTime: 1000 * 60 * 2, // 2 minutes - stats change frequently
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Good for financial data
    retry: 3,
  });
}
