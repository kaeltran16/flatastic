// hooks/useExpenses.ts - Updated with Server Actions
import {
  addExpenseAction,
  deleteExpenseAction,
  editExpenseAction,
  settleExpenseAction,
} from '@/lib/actions/expense';
import { createClient } from '@/lib/supabase/client';
import type {
  ExpenseSplit,
  ExpenseWithDetails,
  Profile,
} from '@/lib/supabase/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner'; // Optional: for user feedback
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

// Balance update functions interface
interface BalanceUpdateFunctions {
  addOptimisticExpense?: (expenseId: string, expenseData: any) => void;
  updateOptimisticExpense?: (expenseId: string, expenseData: any) => void;
  removeOptimisticExpense?: (expenseId: string) => void;
  settleOptimisticExpense?: (
    expenseId: string,
    userId: string,
    isPayer: boolean
  ) => void;
}

// Query keys
const expenseKeys = {
  all: ['expenses'] as const,
  list: () => [...expenseKeys.all, 'list'] as const,
  details: (id: string) => [...expenseKeys.all, 'detail', id] as const,
  household: (id: string) => [...expenseKeys.all, 'household', id] as const,
  members: (householdId: string) => ['household-members', householdId] as const,
  profile: () => ['user-profile'] as const,
};

// Fetch current user profile

// Fetch household members

// Fetch expenses with details
export async function fetchExpenses(
  householdId: string,
  userId: string,
  members: Profile[],
  limit?: number
): Promise<ExpenseWithDetails[]> {
  const supabase = createClient();

  // Build the query without limit first
  let query = supabase
    .from('expenses')
    .select(
      `
      *,
      expense_splits(*)
    `
    )
    .eq('household_id', householdId)
    .order('date', { ascending: false });

  // Only apply limit if provided
  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const { data: expenses, error } = await query;

  if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);

  // Process expenses to add payer info, user share, and status
  const processedExpenses: ExpenseWithDetails[] = (expenses || []).map(
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

  // Sort with pending expenses first
  return processedExpenses.sort((a, b) => {
    if (a.status === 'pending' && b.status === 'settled') return -1;
    if (a.status === 'settled' && b.status === 'pending') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
// Hook to get user profile

// Main expenses hook with server actions
export function useExpenses(balanceUpdates?: BalanceUpdateFunctions) {
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
    queryKey: expenseKeys.household(currentUser?.household_id!),
    queryFn: () =>
      fetchExpenses(
        currentUser!.household_id!,
        currentUser!.id,
        householdMembers
      ),
    enabled: !!currentUser?.household_id && householdMembers.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to create optimistic expense
  const createOptimisticExpense = (
    expenseData: ExpenseFormData,
    tempId: string
  ): ExpenseWithDetails => {
    const expenseAmount = expenseData.amount;
    let optimisticSplits: any[] = [];

    if (expenseData.split_type === 'equal') {
      const splitAmount = expenseAmount / householdMembers.length;
      optimisticSplits = householdMembers.map((member) => ({
        id: `temp-split-${member.id}`,
        expense_id: tempId,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === currentUser!.id,
      }));
    } else if (expenseData.split_type === 'custom') {
      optimisticSplits = expenseData.custom_splits!.map((split) => ({
        id: `temp-split-${split.user_id}`,
        expense_id: tempId,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === currentUser!.id,
      }));
    }

    return {
      id: tempId,
      household_id: currentUser!.household_id!,
      description: expenseData.description.trim(),
      amount: expenseAmount,
      paid_by: currentUser!.id,
      category: expenseData.category,
      date: expenseData.date,
      split_type: expenseData.split_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer: currentUser!,
      splits: optimisticSplits,
      your_share:
        optimisticSplits.find((s) => s.user_id === currentUser!.id)
          ?.amount_owed || 0,
      status: 'pending' as const,
    };
  };

  // Add expense with server action
  // Add expense with server action
  const addExpense = useCallback(
    async (expenseData: ExpenseFormData) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsAddingExpense(true);

      // Create optimistic expense
      const tempId = `temp-${Date.now()}`;
      const optimisticExpense = createOptimisticExpense(expenseData, tempId);

      try {
        // Add optimistic update to cache
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) => [optimisticExpense, ...old]
        );

        // Update balances optimistically
        if (balanceUpdates?.addOptimisticExpense) {
          balanceUpdates.addOptimisticExpense(tempId, {
            amount: expenseData.amount,
            paid_by: currentUser.id,
            household_id: currentUser.household_id,
            date: expenseData.date,
            split_type: expenseData.split_type,
            custom_splits: expenseData.custom_splits,
          });
        }

        // Call server action
        const result = await addExpenseAction(expenseData);

        if (!result.success) {
          throw new Error(result.error || 'Failed to add expense');
        }

        // Create the real expense object with proper structure
        const realExpense: ExpenseWithDetails = {
          ...result.data!.expense,
          payer: currentUser,
          splits: result.data!.splits,
          your_share:
            result.data!.splits.find((s) => s.user_id === currentUser.id)
              ?.amount_owed || 0,
          status: 'pending' as const,
        };

        // Replace optimistic expense with real data
        // Remove the temp expense and add the real one
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) => {
            // Filter out the temporary expense and add the real one
            const withoutTemp = old.filter((expense) => expense.id !== tempId);
            return [realExpense, ...withoutTemp];
          }
        );

        // Update balances: remove temp and add real
        if (
          balanceUpdates?.removeOptimisticExpense &&
          balanceUpdates?.addOptimisticExpense
        ) {
          balanceUpdates.removeOptimisticExpense(tempId);
          balanceUpdates.addOptimisticExpense(result.data!.expense.id, {
            amount: expenseData.amount,
            paid_by: currentUser.id,
            household_id: currentUser.household_id,
            date: expenseData.date,
            split_type: expenseData.split_type,
            custom_splits: expenseData.custom_splits,
          });
        }

        toast?.success?.('Expense added successfully');
      } catch (error) {
        // Remove optimistic update on error
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            old.filter((exp) => exp.id !== tempId)
        );

        // Remove optimistic balance update
        if (balanceUpdates?.removeOptimisticExpense) {
          balanceUpdates.removeOptimisticExpense(tempId);
        }

        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to add expense'
        );
        throw error;
      } finally {
        setIsAddingExpense(false);
      }
    },
    [currentUser, householdMembers, queryClient, balanceUpdates]
  );

  // Edit expense with server action
  const editExpense = useCallback(
    async (expenseId: string, expenseData: ExpenseFormData) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsEditingExpense(true);

      const existingExpense = expenses.find((e) => e.id === expenseId);
      if (!existingExpense) throw new Error('Expense not found');

      try {
        // Create optimistic update
        const expenseAmount = expenseData.amount;
        let optimisticSplits: any[] = [];

        if (expenseData.split_type === 'equal') {
          const splitAmount = expenseAmount / householdMembers.length;
          optimisticSplits = householdMembers.map((member, index) => ({
            id: existingExpense.splits[index]?.id || `temp-split-${member.id}`,
            expense_id: expenseId,
            user_id: member.id,
            amount_owed: splitAmount,
            is_settled: member.id === currentUser.id,
          }));
        } else if (expenseData.split_type === 'custom') {
          optimisticSplits = expenseData.custom_splits!.map((split) => ({
            id:
              existingExpense.splits.find((s) => s.user_id === split.user_id)
                ?.id || `temp-split-${split.user_id}`,
            expense_id: expenseId,
            user_id: split.user_id,
            amount_owed: split.amount,
            is_settled: split.user_id === currentUser.id,
          }));
        }

        const optimisticExpense: ExpenseWithDetails = {
          ...existingExpense,
          description: expenseData.description.trim(),
          amount: expenseAmount,
          category: expenseData.category,
          date: expenseData.date,
          split_type: expenseData.split_type,
          updated_at: new Date().toISOString(),
          splits: optimisticSplits,
          your_share:
            optimisticSplits.find((s) => s.user_id === currentUser.id)
              ?.amount_owed || 0,
        };

        // Apply optimistic update
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            old.map((exp) => (exp.id === expenseId ? optimisticExpense : exp))
        );

        // Update balances optimistically
        if (balanceUpdates?.updateOptimisticExpense) {
          balanceUpdates.updateOptimisticExpense(expenseId, {
            amount: expenseAmount,
            paid_by: currentUser.id,
            household_id: currentUser.household_id,
            date: expenseData.date,
            split_type: expenseData.split_type,
            custom_splits: expenseData.custom_splits,
          });
        }

        // Call server action
        const result = await editExpenseAction(expenseId, expenseData);

        if (!result.success) {
          throw new Error(result.error || 'Failed to edit expense');
        }

        // Update with real data from server
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            old.map((exp) =>
              exp.id === expenseId
                ? {
                    ...optimisticExpense,
                    splits: result.data!.splits,
                    your_share:
                      result.data!.splits.find(
                        (s) => s.user_id === currentUser.id
                      )?.amount_owed || 0,
                  }
                : exp
            )
        );

        toast?.success?.('Expense updated successfully');
      } catch (error) {
        // Revert optimistic update
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            old.map((exp) => (exp.id === expenseId ? existingExpense : exp))
        );

        // Revert balance update
        if (balanceUpdates?.updateOptimisticExpense) {
          balanceUpdates.updateOptimisticExpense(expenseId, {
            amount: existingExpense.amount,
            paid_by: existingExpense.paid_by,
            household_id: existingExpense.household_id,
            date: existingExpense.date,
            split_type: existingExpense.split_type,
            custom_splits: existingExpense.splits.map((s) => ({
              user_id: s.user_id,
              amount: s.amount_owed,
            })),
          });
        }

        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to edit expense'
        );
        throw error;
      } finally {
        setIsEditingExpense(false);
      }
    },
    [currentUser, householdMembers, expenses, queryClient, balanceUpdates]
  );

  // Delete expense with server action
  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!currentUser?.household_id) throw new Error('No household found');

      setIsDeletingExpense(true);

      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) throw new Error('Expense not found');

      try {
        // Optimistically remove from cache
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            old.filter((exp) => exp.id !== expenseId)
        );

        // Update balances optimistically
        if (balanceUpdates?.removeOptimisticExpense) {
          balanceUpdates.removeOptimisticExpense(expenseId);
        }

        // Call server action
        const result = await deleteExpenseAction(expenseId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete expense');
        }

        toast?.success?.('Expense deleted successfully');
      } catch (error) {
        // Restore expense on error
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id),
          (old: ExpenseWithDetails[] = []) =>
            [expense, ...old].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        );

        // Restore balance
        if (balanceUpdates?.addOptimisticExpense) {
          balanceUpdates.addOptimisticExpense(expenseId, {
            amount: expense.amount,
            paid_by: expense.paid_by,
            household_id: expense.household_id,
            date: expense.date,
            split_type: expense.split_type,
            custom_splits: expense.splits.map((s) => ({
              user_id: s.user_id,
              amount: s.amount_owed,
            })),
          });
        }

        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to delete expense'
        );
        throw error;
      } finally {
        setIsDeletingExpense(false);
      }
    },
    [currentUser, expenses, queryClient, balanceUpdates]
  );

  // Settle expense with server action
  const settleExpense = useCallback(
    async (expense: ExpenseWithDetails) => {
      if (!currentUser) throw new Error('No current user');

      setIsSettlingExpense(true);

      try {
        const isPayer = expense.paid_by === currentUser.id;

        // Optimistic update
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id!),
          (old: ExpenseWithDetails[] = []) =>
            old.map((exp) => {
              if (exp.id !== expense.id) return exp;

              let updatedSplits;
              if (isPayer) {
                updatedSplits = exp.splits.map((split) => ({
                  ...split,
                  is_settled: true,
                }));
              } else {
                updatedSplits = exp.splits.map((split) =>
                  split.user_id === currentUser.id
                    ? { ...split, is_settled: true }
                    : split
                );
              }

              return {
                ...exp,
                splits: updatedSplits,
                status: updatedSplits.every((split) => split.is_settled)
                  ? ('settled' as const)
                  : ('pending' as const),
              };
            })
        );

        // Update balances optimistically
        if (balanceUpdates?.settleOptimisticExpense) {
          balanceUpdates.settleOptimisticExpense(
            expense.id,
            currentUser.id,
            isPayer
          );
        }

        // Call server action
        const result = await settleExpenseAction(expense.id);

        if (!result.success) {
          throw new Error(result.error || 'Failed to settle expense');
        }

        toast?.success?.('Expense settled successfully');
      } catch (error) {
        // Revert optimistic update
        queryClient.setQueryData(
          expenseKeys.household(currentUser.household_id!),
          (old: ExpenseWithDetails[] = []) =>
            old.map((exp) => (exp.id === expense.id ? expense : exp))
        );

        toast?.error?.(
          error instanceof Error ? error.message : 'Failed to settle expense'
        );
        throw error;
      } finally {
        setIsSettlingExpense(false);
      }
    },
    [currentUser, queryClient, balanceUpdates]
  );

  // Calculate stats
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
    refreshData: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
    // Loading states for individual operations
    isAddingExpense,
    isEditingExpense,
    isDeletingExpense,
    isSettlingExpense,
  };
}
