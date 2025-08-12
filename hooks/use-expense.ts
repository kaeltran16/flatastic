// hooks/useExpenses.ts
import { createClient } from '@/lib/supabase/client';
import type { ExpenseSplit, Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

export function useExpenses() {
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

  const addExpense = async (expenseData: {
    description: string;
    amount: string;
    category: string;
    date: string;
    split_type: string;
  }) => {
    if (!currentUser?.household_id) throw new Error('No household found');

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        household_id: currentUser.household_id,
        description: expenseData.description.trim(),
        amount: parseFloat(expenseData.amount),
        paid_by: currentUser.id,
        category: expenseData.category,
        date: expenseData.date,
        split_type: expenseData.split_type,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Create expense splits for all household members
    if (expenseData.split_type === 'equal') {
      const splitAmount =
        parseFloat(expenseData.amount) / householdMembers.length;
      const splits = householdMembers.map((member) => ({
        expense_id: expense.id,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === currentUser.id,
      }));

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitsError) throw splitsError;
    }

    // Refresh data after adding expense
    await loadData();
  };

  const settleExpense = async (expense: ExpenseWithDetails) => {
    try {
      if (!currentUser) throw new Error('No current user');

      // Check if current user is the payer
      const isPayer = expense.paid_by === currentUser.id;

      if (isPayer) {
        // If you're the payer, mark ALL unsettled splits as settled
        // (This means you're forgiving the debt or received payment outside the app)
        const unsettledSplits = expense.splits.filter(
          (split) => !split.is_settled
        );

        if (unsettledSplits.length === 0) {
          throw new Error('All splits are already settled');
        }

        const { error } = await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .in(
            'id',
            unsettledSplits.map((split) => split.id)
          );

        if (error) throw error;
      } else {
        // If you're not the payer, mark only your split as settled
        const userSplit = expense.splits.find(
          (split) => split.user_id === currentUser.id
        );

        if (!userSplit) {
          throw new Error('No split found for current user');
        }

        if (userSplit.is_settled) {
          throw new Error('Your split is already settled');
        }

        const { error } = await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .eq('id', userSplit.id);

        if (error) throw error;
      }

      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Failed to settle expense:', error);
      throw error;
    }
  };

  // Calculate stats
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
    settleExpense,
    refreshData: loadData,
  };
}
