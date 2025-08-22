// hooks/useExpenses.ts
import { createClient } from '@/lib/supabase/client';
import type { ExpenseSplit, Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

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

// Add balance update functions to the hook interface
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

export function useExpenses(balanceUpdates?: BalanceUpdateFunctions) {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setCurrentUser(profile);

      if (!profile.household_id) {
        setError('No household found');
        return;
      }

      // Get household members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', profile.household_id);

      if (membersError) throw membersError;
      setHouseholdMembers(members || []);

      // Load expenses
      await loadExpenses(profile.household_id, user.id, members || []);
    } catch (err) {
      console.error('Error loading expenses data:', err);
      setError('Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async (
    householdId: string,
    userId: string,
    members: Profile[]
  ) => {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select(
        `
        *,
        expense_splits(*)
      `
      )
      .eq('household_id', householdId)
      .order('date', { ascending: false });

    if (error) throw error;

    // Process expenses to add payer name, your share, and status
    const processedExpenses: ExpenseWithDetails[] = (expenses || []).map(
      (expense) => {
        const payer = members.find((member) => member.id === expense.paid_by);
        const userSplit = expense.expense_splits.find(
          (split: ExpenseSplit) => split.user_id === userId
        );
        const allSettled = expense.expense_splits.every(
          (split: ExpenseSplit) => split.is_settled
        );

        return {
          ...expense,
          payer_name: payer?.full_name || 'Unknown',
          payer_payment_link: payer?.payment_link,
          splits: expense.expense_splits,
          your_share: userSplit?.amount_owed || 0,
          status: allSettled ? 'settled' : 'pending',
        };
      }
    );

    setExpenses(processedExpenses);
  };

  const addExpense = async (expenseData: ExpenseFormData) => {
    if (!currentUser?.household_id) throw new Error('No household found');

    // Create optimistic expense object
    const tempId = `temp-${Date.now()}`;
    const expenseAmount = expenseData.amount;

    let optimisticSplits: any[] = [];

    if (expenseData.split_type === 'equal') {
      const splitAmount = expenseAmount / householdMembers.length;
      optimisticSplits = householdMembers.map((member) => ({
        id: `temp-split-${member.id}`,
        expense_id: tempId,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === currentUser.id,
      }));
    } else if (expenseData.split_type === 'custom') {
      if (
        !expenseData.custom_splits ||
        expenseData.custom_splits.length === 0
      ) {
        throw new Error('Custom splits are required for custom split type');
      }

      // Validate that the splits add up to the total amount
      const totalSplitAmount = expenseData.custom_splits.reduce(
        (sum, split) => sum + split.amount,
        0
      );

      if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
        throw new Error(
          'Split amounts must add up to the total expense amount'
        );
      }

      optimisticSplits = expenseData.custom_splits.map((split) => ({
        id: `temp-split-${split.user_id}`,
        expense_id: tempId,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === currentUser.id,
      }));
    }

    const optimisticExpense: ExpenseWithDetails = {
      id: tempId,
      household_id: currentUser.household_id,
      description: expenseData.description.trim(),
      amount: expenseAmount,
      paid_by: currentUser.id,
      category: expenseData.category,
      date: expenseData.date,
      split_type: expenseData.split_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer_name: currentUser.full_name || 'Unknown',
      payer_payment_link: currentUser.payment_link || 'Unknown',
      splits: optimisticSplits,
      your_share:
        optimisticSplits.find((s) => s.user_id === currentUser.id)
          ?.amount_owed || 0,
      status: 'pending' as const,
    };

    // Optimistically update expenses UI
    setExpenses((prev) => [optimisticExpense, ...prev]);

    // Optimistically update balances
    if (balanceUpdates?.addOptimisticExpense) {
      balanceUpdates.addOptimisticExpense(tempId, {
        amount: expenseAmount,
        paid_by: currentUser.id,
        household_id: currentUser.household_id,
        date: expenseData.date,
        split_type: expenseData.split_type,
        custom_splits: expenseData.custom_splits,
      });
    }

    try {
      // Create the actual expense in the database
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          household_id: currentUser.household_id,
          description: expenseData.description.trim(),
          amount: expenseAmount,
          paid_by: currentUser.id,
          category: expenseData.category,
          date: expenseData.date,
          split_type: expenseData.split_type,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense splits
      let splits: any[] = [];
      if (expenseData.split_type === 'equal') {
        const splitAmount = expenseAmount / householdMembers.length;
        splits = householdMembers.map((member) => ({
          expense_id: expense.id,
          user_id: member.id,
          amount_owed: splitAmount,
          is_settled: member.id === currentUser.id,
        }));
      } else if (expenseData.split_type === 'custom') {
        splits = expenseData.custom_splits!.map((split) => ({
          expense_id: expense.id,
          user_id: split.user_id,
          amount_owed: split.amount,
          is_settled: split.user_id === currentUser.id,
        }));
      }

      const { data: createdSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)
        .select();

      if (splitsError) throw splitsError;

      // Update the optimistic expense with real data
      const realExpense: ExpenseWithDetails = {
        ...expense,
        payer_name: currentUser.full_name || 'Unknown',
        payer_payment_link: currentUser.payment_link || 'Unknown',
        splits: createdSplits,
        your_share:
          createdSplits.find((s) => s.user_id === currentUser.id)
            ?.amount_owed || 0,
        status: 'pending' as const,
      };

      // Replace the optimistic expense with the real one
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === tempId ? realExpense : exp))
      );

      // Update balances with real expense ID
      if (
        balanceUpdates?.removeOptimisticExpense &&
        balanceUpdates?.addOptimisticExpense
      ) {
        balanceUpdates.removeOptimisticExpense(tempId);
        balanceUpdates.addOptimisticExpense(expense.id, {
          amount: expenseAmount,
          paid_by: currentUser.id,
          household_id: currentUser.household_id,
          date: expenseData.date,
          split_type: expenseData.split_type,
          custom_splits: expenseData.custom_splits,
        });
      }
    } catch (error) {
      // Remove the optimistic updates on error
      setExpenses((prev) => prev.filter((exp) => exp.id !== tempId));
      if (balanceUpdates?.removeOptimisticExpense) {
        balanceUpdates.removeOptimisticExpense(tempId);
      }
      throw error;
    }
  };

  const editExpense = async (
    expenseId: string,
    expenseData: ExpenseFormData
  ) => {
    if (!currentUser?.household_id) throw new Error('No household found');

    // Find the existing expense
    const existingExpense = expenses.find((e) => e.id === expenseId);
    if (!existingExpense) throw new Error('Expense not found');

    // Validation checks
    if (existingExpense.paid_by !== currentUser.id) {
      throw new Error('Only the payer can edit this expense');
    }

    const hasOtherSettledSplits = existingExpense.splits.some(
      (split) => split.user_id !== currentUser.id && split.is_settled
    );

    if (hasOtherSettledSplits) {
      throw new Error('Cannot edit expense with settled payments from others');
    }

    // Create optimistic updated expense
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
      if (
        !expenseData.custom_splits ||
        expenseData.custom_splits.length === 0
      ) {
        throw new Error('Custom splits are required for custom split type');
      }

      const totalSplitAmount = expenseData.custom_splits.reduce(
        (sum, split) => sum + split.amount,
        0
      );

      if (Math.abs(totalSplitAmount - expenseAmount) > 0.01) {
        throw new Error(
          'Split amounts must add up to the total expense amount'
        );
      }

      optimisticSplits = expenseData.custom_splits.map((split) => ({
        id:
          existingExpense.splits.find((s) => s.user_id === split.user_id)?.id ||
          `temp-split-${split.user_id}`,
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

    // Optimistically update expenses UI
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === expenseId ? optimisticExpense : exp))
    );

    // Optimistically update balances
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

    try {
      // Update the expense in the database
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({
          description: expenseData.description.trim(),
          amount: expenseAmount,
          category: expenseData.category,
          date: expenseData.date,
          split_type: expenseData.split_type,
        })
        .eq('id', expenseId);

      if (expenseError) throw expenseError;

      // Delete and recreate splits
      const { error: deleteSplitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (deleteSplitsError) throw deleteSplitsError;

      // Create new splits
      let splits: any[] = [];
      if (expenseData.split_type === 'equal') {
        const splitAmount = expenseAmount / householdMembers.length;
        splits = householdMembers.map((member) => ({
          expense_id: expenseId,
          user_id: member.id,
          amount_owed: splitAmount,
          is_settled: member.id === currentUser.id,
        }));
      } else if (expenseData.split_type === 'custom') {
        splits = expenseData.custom_splits!.map((split) => ({
          expense_id: expenseId,
          user_id: split.user_id,
          amount_owed: split.amount,
          is_settled: split.user_id === currentUser.id,
        }));
      }

      const { data: newSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits)
        .select();

      if (splitsError) throw splitsError;

      // Update with real data from server
      const updatedExpense: ExpenseWithDetails = {
        ...optimisticExpense,
        splits: newSplits,
        your_share:
          newSplits.find((s) => s.user_id === currentUser.id)?.amount_owed || 0,
      };

      setExpenses((prev) =>
        prev.map((exp) => (exp.id === expenseId ? updatedExpense : exp))
      );
    } catch (error) {
      // Revert to original expense on error
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === expenseId ? existingExpense : exp))
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
      throw error;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!currentUser?.household_id) throw new Error('No household found');

    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) throw new Error('Expense not found');

    // Validation checks
    if (expense.paid_by !== currentUser.id) {
      throw new Error('Only the payer can delete this expense');
    }

    const hasOtherSettledSplits = expense.splits.some(
      (split) => split.user_id !== currentUser.id && split.is_settled
    );

    if (hasOtherSettledSplits) {
      throw new Error(
        'Cannot delete expense with settled payments from others'
      );
    }

    // Optimistically remove from UI
    setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));

    // Optimistically update balances
    if (balanceUpdates?.removeOptimisticExpense) {
      balanceUpdates.removeOptimisticExpense(expenseId);
    }

    try {
      // Delete from database
      const { error: deleteSplitsError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', expenseId);

      if (deleteSplitsError) throw deleteSplitsError;

      const { error: deleteExpenseError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (deleteExpenseError) throw deleteExpenseError;
    } catch (error) {
      // Restore the expense on error
      setExpenses((prev) =>
        [expense, ...prev].sort(
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
      throw error;
    }
  };

  const settleExpense = async (expense: ExpenseWithDetails) => {
    if (!currentUser) throw new Error('No current user');

    const isPayer = expense.paid_by === currentUser.id;

    // Create optimistic update
    let updatedSplits;
    if (isPayer) {
      const unsettledSplits = expense.splits.filter(
        (split) => !split.is_settled
      );
      if (unsettledSplits.length === 0) {
        throw new Error('All splits are already settled');
      }

      updatedSplits = expense.splits.map((split) => ({
        ...split,
        is_settled: true,
      }));
    } else {
      const userSplit = expense.splits.find(
        (split) => split.user_id === currentUser.id
      );
      if (!userSplit) {
        throw new Error('No split found for current user');
      }
      if (userSplit.is_settled) {
        throw new Error('Your split is already settled');
      }

      updatedSplits = expense.splits.map((split) =>
        split.user_id === currentUser.id
          ? { ...split, is_settled: true }
          : split
      );
    }

    const optimisticExpense = {
      ...expense,
      splits: updatedSplits,
      status: updatedSplits.every((split) => split.is_settled)
        ? ('settled' as const)
        : ('pending' as const),
    };

    // Optimistically update expenses UI
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === expense.id ? optimisticExpense : exp))
    );

    // Optimistically update balances
    if (balanceUpdates?.settleOptimisticExpense) {
      balanceUpdates.settleOptimisticExpense(
        expense.id,
        currentUser.id,
        isPayer
      );
    }

    try {
      if (isPayer) {
        const unsettledSplits = expense.splits.filter(
          (split) => !split.is_settled
        );

        const { error } = await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .in(
            'id',
            unsettledSplits.map((split) => split.id)
          );

        if (error) throw error;
      } else {
        const userSplit = expense.splits.find(
          (split) => split.user_id === currentUser.id
        );

        const { error } = await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .eq('id', userSplit!.id);

        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === expense.id ? expense : exp))
      );

      // Revert balance update by recalculating from the original expense
      if (balanceUpdates?.settleOptimisticExpense) {
        // This is a bit tricky - we'd need to revert the settlement
        // For now, we'll rely on a full refresh if settlement fails
        console.warn('Settlement failed - balance state may be inconsistent');
      }

      console.error('Failed to settle expense:', error);
      throw error;
    }
  };

  // Calculate stats from current state
  const stats = {
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    yourTotalShare: expenses.reduce(
      (sum, expense) => sum + expense.your_share,
      0
    ),
    pendingExpenses: expenses.filter((expense) => expense.status === 'pending'),
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    expenses: expenses.sort((a, b) => (a.status === 'pending' ? -1 : 1)),
    householdMembers,
    currentUser,
    loading,
    error,
    stats,
    addExpense,
    editExpense,
    deleteExpense,
    settleExpense,
    refreshData: loadData,
  };
}
