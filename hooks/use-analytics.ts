'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ChoreStatItem {
  name: string;
  completed: number;
  fill: string;
}

export interface ExpenseStatItem {
  category: string;
  amount: number;
  fill: string;
}

export interface ContributionStatItem {
  name: string;
  amount: number;
  fill: string;
}

export interface TrendDataPoint {
  month: string;
  monthShort: string;
  completed: number;
  pending: number;
}

export interface ExpenseTrendDataPoint {
  month: string;
  monthShort: string;
  amount: number;
}

export interface AnalyticsTotals {
  totalChoresCompleted: number;
  totalChoresPending: number;
  totalExpenses: number;
  topContributor: string;
  topContributorAmount: number;
  choreCompletionRate: number;
}

export interface AnalyticsComparison {
  expenseChange: number;
  choreChange: number;
}

export interface AnalyticsData {
  choreStats: ChoreStatItem[];
  expenseStats: ExpenseStatItem[];
  contributionStats: ContributionStatItem[];
  choreTrends: TrendDataPoint[];
  expenseTrends: ExpenseTrendDataPoint[];
  totals: AnalyticsTotals;
  comparison: AnalyticsComparison;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatMonthShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

async function fetchAnalytics(householdId: string): Promise<AnalyticsData> {
  const supabase = createClient();
  const thisMonthStart = getMonthsAgo(0);
  const lastMonthStart = getMonthsAgo(1);

  // Fetch all profiles in the household
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('household_id', householdId);

  if (!profiles) throw new Error('Failed to fetch profiles');

  // Fetch all chores (for stats and trends)
  // Use updated_at for completed chores since there's no completed_at column
  const { data: allChores } = await supabase
    .from('chores')
    .select('assigned_to, status, updated_at, created_at, due_date')
    .eq('household_id', householdId);

  // Fetch all expenses (for stats and trends)
  const { data: allExpenses } = await supabase
    .from('expenses')
    .select('amount, category, paid_by, created_at')
    .eq('household_id', householdId);

  const chores = allChores || [];
  const expenses = allExpenses || [];

  // Process Chore Stats (completed only)
  const completedChores = chores.filter((c) => c.status === 'completed');
  const pendingChores = chores.filter((c) => c.status !== 'completed');

  const choreStats: ChoreStatItem[] = profiles.map((profile, index) => {
    const completedCount = completedChores.filter(
      (c) => c.assigned_to === profile.id
    ).length;
    return {
      name: profile.full_name || 'Unknown',
      completed: completedCount,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  // Process Expense Stats
  const expenseMap = new Map<string, number>();
  expenses.forEach((expense) => {
    const category = expense.category || 'Uncategorized';
    const current = expenseMap.get(category) || 0;
    expenseMap.set(category, current + Number(expense.amount));
  });

  const expenseStats: ExpenseStatItem[] = Array.from(expenseMap.entries()).map(
    ([category, amount], index) => ({
      category,
      amount,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })
  );

  // Process Contribution Stats
  const contributionStats: ContributionStatItem[] = profiles.map(
    (profile, index) => {
      const totalPaid =
        expenses
          .filter((e) => e.paid_by === profile.id)
          .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      return {
        name: profile.full_name || 'Unknown',
        amount: totalPaid,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      };
    }
  );

  // Generate trend data for the last 6 months
  const choreTrends: TrendDataPoint[] = [];
  const expenseTrends: ExpenseTrendDataPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthStart = getMonthsAgo(i);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // Chore trends - count completed chores by updated_at date
    // (updated_at is set when status changes to completed)
    const monthCompletedChores = completedChores.filter((c) => {
      const updatedDate = c.updated_at ? new Date(c.updated_at) : null;
      return (
        updatedDate && updatedDate >= monthStart && updatedDate < monthEnd
      );
    }).length;

    // Count pending as those that were due that month but not completed
    const monthPendingChores = pendingChores.filter((c) => {
      const dueDate = c.due_date ? new Date(c.due_date) : null;
      return dueDate && dueDate >= monthStart && dueDate < monthEnd;
    }).length;

    choreTrends.push({
      month: formatMonth(monthStart),
      monthShort: formatMonthShort(monthStart),
      completed: monthCompletedChores,
      pending: monthPendingChores,
    });

    // Expense trends
    const monthExpenses = expenses
      .filter((e) => {
        if (!e.created_at) return false;
        const createdDate = new Date(e.created_at);
        return createdDate >= monthStart && createdDate < monthEnd;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);

    expenseTrends.push({
      month: formatMonth(monthStart),
      monthShort: formatMonthShort(monthStart),
      amount: monthExpenses,
    });
  }

  // Calculate totals
  const totalChoresCompleted = completedChores.length;
  const totalChoresPending = pendingChores.length;
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Find top contributor
  const sortedContributions = [...contributionStats].sort(
    (a, b) => b.amount - a.amount
  );
  const topContributor = sortedContributions[0]?.name || 'N/A';
  const topContributorAmount = sortedContributions[0]?.amount || 0;

  // Calculate completion rate
  const totalChores = totalChoresCompleted + totalChoresPending;
  const choreCompletionRate =
    totalChores > 0
      ? Math.round((totalChoresCompleted / totalChores) * 100)
      : 0;

  // Calculate period comparison
  const thisMonthExpenses = expenses
    .filter((e) => e.created_at && new Date(e.created_at) >= thisMonthStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lastMonthEnd = thisMonthStart;
  const lastMonthExpenses = expenses
    .filter((e) => {
      if (!e.created_at) return false;
      const date = new Date(e.created_at);
      return date >= lastMonthStart && date < lastMonthEnd;
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const expenseChange =
    lastMonthExpenses > 0
      ? Math.round(
          ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        )
      : 0;

  // For chore comparison, use updated_at for completed chores
  const thisMonthChores = completedChores.filter(
    (c) => c.updated_at && new Date(c.updated_at) >= thisMonthStart
  ).length;

  const lastMonthChores = completedChores.filter((c) => {
    if (!c.updated_at) return false;
    const date = new Date(c.updated_at);
    return date >= lastMonthStart && date < lastMonthEnd;
  }).length;

  const choreChange =
    lastMonthChores > 0
      ? Math.round(
          ((thisMonthChores - lastMonthChores) / lastMonthChores) * 100
        )
      : 0;

  return {
    choreStats,
    expenseStats,
    contributionStats,
    choreTrends,
    expenseTrends,
    totals: {
      totalChoresCompleted,
      totalChoresPending,
      totalExpenses,
      topContributor,
      topContributorAmount,
      choreCompletionRate,
    },
    comparison: {
      expenseChange,
      choreChange,
    },
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
