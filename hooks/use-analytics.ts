import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface AnalyticsData {
  choreStats: {
    name: string;
    completed: number;
    fill: string;
  }[];
  expenseStats: {
    category: string;
    amount: number;
    fill: string;
  }[];
  contributionStats: {
    name: string;
    amount: number;
    fill: string;
  }[];
}

async function fetchAnalytics(householdId: string): Promise<AnalyticsData> {
  const supabase = createClient();

  // Fetch all profiles in the household
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('household_id', householdId);

  if (!profiles) throw new Error('Failed to fetch profiles');

  // Fetch completed chores
  const { data: chores } = await supabase
    .from('chores')
    .select('assigned_to')
    .eq('household_id', householdId)
    .eq('status', 'completed');

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, paid_by')
    .eq('household_id', householdId);

  // Process Chore Stats
  const choreStats = profiles.map((profile, index) => {
    const completedCount = chores?.filter(
      (c) => c.assigned_to === profile.id
    ).length || 0;
    return {
      name: profile.full_name || 'Unknown',
      completed: completedCount,
      fill: `var(--chart-${(index % 5) + 1})`,
    };
  });

  // Process Expense Stats
  const expenseMap = new Map<string, number>();
  expenses?.forEach((expense) => {
    const category = expense.category || 'Uncategorized';
    const current = expenseMap.get(category) || 0;
    expenseMap.set(category, current + Number(expense.amount));
  });

  const expenseStats = Array.from(expenseMap.entries()).map(([category, amount], index) => ({
    category,
    amount,
    fill: `var(--chart-${(index % 5) + 1})`,
  }));

  // Process Contribution Stats
  const contributionStats = profiles.map((profile, index) => {
    const totalPaid = expenses
      ?.filter((e) => e.paid_by === profile.id)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    return {
      name: profile.full_name || 'Unknown',
      amount: totalPaid,
      fill: `var(--chart-${(index % 5) + 1})`,
    };
  });

  return {
    choreStats,
    expenseStats,
    contributionStats,
  };
}

export function useAnalytics(householdId?: string) {
  return useQuery({
    queryKey: ['analytics', householdId],
    queryFn: () => {
      if (!householdId) throw new Error('Household ID is required');
      return fetchAnalytics(householdId);
    },
    enabled: !!householdId,
  });
}
