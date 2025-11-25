// hooks/useExpensesList.ts - Refactored with best practices
import { queryKeys } from '@/lib/query-keys';
import { Profile } from '@/lib/supabase/schema.alias';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchExpenses } from './use-expense';

export function useExpensesList(
  householdId: string,
  userId: string,
  members: Profile[],
  limit?: number
) {
  // Use the same query key as useExpenses - this is key!
  const {
    data: allExpenses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.expenses.household(householdId),
    queryFn: () => fetchExpenses(householdId, userId), // Removed members parameter
    enabled: !!householdId && !!userId, // Removed members.length check
    staleTime: 5 * 60 * 1000, // Updated from 2 to 5 minutes
    gcTime: 10 * 60 * 1000, // Updated from 5 to 10 minutes
  });

  // Apply limit on client side using useMemo for performance
  const expenses = useMemo(() => {
    return limit ? allExpenses.slice(0, limit) : allExpenses;
  }, [allExpenses, limit]);

  // Calculate stats from the limited expenses
  const stats = useMemo(
    () => ({
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      yourTotalShare: expenses.reduce(
        (sum, expense) => sum + expense.your_share,
        0
      ),
      pendingExpenses: expenses.filter(
        (expense) => expense.status === 'pending'
      ),
    }),
    [expenses]
  );

  return {
    expenses,
    loading: isLoading,
    error: error?.message || null,
    stats,
    refetch,
  };
}
