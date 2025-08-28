// hooks/useExpensesList.ts
import { useQuery } from '@tanstack/react-query';
import { fetchExpenses } from './use-expense';
import { useHouseholdMembers } from './use-household-member';

export function useExpensesList(householdId?: string, userId?: string) {
  const { members } = useHouseholdMembers(householdId);

  const {
    data: expenses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expenses', 'list', householdId, userId],
    queryFn: () => fetchExpenses(householdId!, userId!, members, 5),
    enabled: !!householdId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate basic stats
  const stats = {
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    yourTotalShare: expenses.reduce(
      (sum, expense) => sum + expense.your_share,
      0
    ),
    pendingExpenses: expenses.filter((expense) => expense.status === 'pending'),
  };

  return {
    expenses,
    loading: isLoading,
    error: error?.message || null,
    stats,
    refetch,
  };
}
