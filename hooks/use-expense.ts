// hooks/useExpenses.ts - Refactored with best practices
import {
  addExpenseAction,
  deleteExpenseAction,
  editExpenseAction,
  settleBalanceAction,
  settleExpenseAction,
} from '@/lib/actions/expense';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/client';
import type {
  ExpenseSplit,
  ExpenseWithDetails
} from '@/lib/supabase/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useHouseholdMembers } from './use-household-member';
import { useProfile } from './use-profile';

export interface CustomSplit {
  user_id: string;
  amount: number;
}

export interface ExpenseFormData {
  description: string;
  amount: number;
  category: string;
  date: string;
  split_type: 'equal' | 'custom';
  custom_splits?: CustomSplit[];
  selected_users?: string[];
}

// Fetch expenses function - now fetches members in parallel
export async function fetchExpenses(
  householdId: string,
  userId: string
): Promise<ExpenseWithDetails[]> {
  const supabase = createClient();

  // Fetch expenses and members in parallel to reduce waterfall
  const [expensesResult, membersResult] = await Promise.all([
    supabase
      .from('expenses')
      .select(
        `
      *,
      expense_splits(*)
    `
      )
      .eq('household_id', householdId)
      .order('date', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .eq('household_id', householdId),
  ]);

  if (expensesResult.error) throw new Error(`Failed to fetch expenses: ${expensesResult.error.message}`);
  if (membersResult.error) throw new Error(`Failed to fetch members: ${membersResult.error.message}`);

  const members = membersResult.data || [];
  const expenses = expensesResult.data || [];

  const processedExpenses: ExpenseWithDetails[] = expenses.map(
    (expense) => {
      const payer = members.find((member) => member.id === expense.paid_by);
      if (!payer) throw new Error(`Payer not found for expense ${expense.id}`);

      const userSplit = expense.expense_splits.find(
        (split: ExpenseSplit) => split.user_id === userId
      );
      const allSettled = expense.expense_splits.every(
        (split: ExpenseSplit) => split.is_settled
      );

      return {
        ...expense,
        payer,
        splits: expense.expense_splits,
        your_share: userSplit?.amount_owed || 0,
        status: allSettled ? 'settled' : 'pending',
      };
    }
  );

  return processedExpenses.sort((a, b) => {
    if (a.status === 'pending' && b.status === 'settled') return -1;
    if (a.status === 'settled' && b.status === 'pending') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function useExpenses() {
  const queryClient = useQueryClient();

  // Loading states for individual operations
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isSettlingExpense, setIsSettlingExpense] = useState(false);

  const {
    profile: currentUser,
    loading: profileLoading,
    error: profileError,
  } = useProfile();

  const {
    members: householdMembers = [],
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(currentUser?.household_id);

  const {
    data: expenses = [],
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: queryKeys.expenses.household(currentUser?.household_id!),
    queryFn: () =>
      fetchExpenses(
        currentUser!.household_id!,
        currentUser!.id
        // Members now fetched in parallel inside fetchExpenses
      ),
    enabled: !!currentUser?.household_id, // Removed dependency on householdMembers
    staleTime: 5 * 60 * 1000, // Increased from 2 to 5 minutes
    gcTime: 10 * 60 * 1000, // Increased from 5 to 10 minutes
  });

  // Helper function to invalidate all related queries after mutations
  const invalidateRelatedQueries = useCallback(() => {
    if (!currentUser?.household_id) return;

    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.expenses.household(currentUser.household_id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.balances.household(currentUser.household_id),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.household(currentUser.household_id),
      }),
    ]);
  }, [currentUser?.household_id, queryClient]);

  // Add expense - server-first approach
  const addExpense = useCallback(
    async (expenseData: ExpenseFormData) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsAddingExpense(true);

      try {
        // Call server action first
        const result = await addExpenseAction(expenseData);

        if (!result.success) {
          throw new Error(result.error || 'Failed to add expense');
        }

        // Invalidate all related queries to trigger refresh
        await invalidateRelatedQueries();

        toast?.success?.('Expense added successfully');
      } catch (error) {
        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to add expense'
        );
        throw error;
      } finally {
        setIsAddingExpense(false);
      }
    },
    [currentUser, invalidateRelatedQueries]
  );

  // Edit expense
  const editExpense = useCallback(
    async (expenseId: string, expenseData: ExpenseFormData) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsEditingExpense(true);

      try {
        const result = await editExpenseAction(expenseId, expenseData);

        if (!result.success) {
          throw new Error(result.error || 'Failed to edit expense');
        }

        await invalidateRelatedQueries();
        toast?.success?.('Expense updated successfully');
      } catch (error) {
        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to edit expense'
        );
        throw error;
      } finally {
        setIsEditingExpense(false);
      }
    },
    [currentUser, invalidateRelatedQueries]
  );

  // Delete expense
  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsDeletingExpense(true);

      try {
        const result = await deleteExpenseAction(expenseId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete expense');
        }

        await invalidateRelatedQueries();
        toast?.success?.('Expense deleted successfully');
      } catch (error) {
        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to delete expense'
        );
        throw error;
      } finally {
        setIsDeletingExpense(false);
      }
    },
    [currentUser, invalidateRelatedQueries]
  );

  // Settle expense
  const settleExpense = useCallback(
    async (expense: ExpenseWithDetails) => {
      if (!currentUser) throw new Error('No current user');

      setIsSettlingExpense(true);

      try {
        const result = await settleExpenseAction(expense.id);

        if (!result.success) {
          throw new Error(result.error || 'Failed to settle expense');
        }

        await invalidateRelatedQueries();
        toast?.success?.('Expense settled successfully');
      } catch (error) {
        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to settle expense'
        );
        throw error;
      } finally {
        setIsSettlingExpense(false);
      }
    },
    [currentUser, invalidateRelatedQueries]
  );

  // Settle balance
  const settleBalance = useCallback(
    async (splitIds: string[]) => {
      if (!currentUser) throw new Error('No current user');

      setIsSettlingExpense(true);

      try {
        const result = await settleBalanceAction(splitIds);

        if (!result.success) {
          throw new Error(result.error || 'Failed to settle balance');
        }

        await invalidateRelatedQueries();
        toast?.success?.('Balance settled successfully');
      } catch (error) {
        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to settle balance'
        );
        throw error;
      } finally {
        setIsSettlingExpense(false);
      }
    },
    [currentUser, invalidateRelatedQueries]
  );

  // Calculate stats from current data
  const stats = {
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    yourTotalShare: expenses.reduce(
      (sum, expense) => sum + expense.your_share,
      0
    ),
    pendingExpenses: expenses.filter((expense) => expense.status === 'pending'),
  };

  const loading = profileLoading || membersLoading || expensesLoading;
  const error = profileError || membersError || expensesError;

  return {
    expenses,
    householdMembers,
    currentUser,
    loading,
    error: error?.message || null,
    stats,
    addExpense,
    editExpense,
    deleteExpense,
    settleExpense,
    settleBalance,
    refreshData: invalidateRelatedQueries,
    // Loading states for individual operations
    isAddingExpense,
    isEditingExpense,
    isDeletingExpense,
    isSettlingExpense,
  };
}
