// hooks/useBalances.ts
import { createClient } from '@/lib/supabase/client';
import { Expense, ExpenseSplit, Profile } from '@/lib/supabase/schema.alias';
import { Balance } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

// Types for optimistic updates
interface OptimisticSplit extends Omit<ExpenseSplit, 'created_at'> {
  expense: Expense;
}

export function useBalances() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store splits for optimistic updates
  const [splits, setSplits] = useState<OptimisticSplit[]>([]);

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

      // Load balances
      await loadBalances(profile.household_id, user.id, members || []);
    } catch (err) {
      console.error('Error loading balances data:', err);
      setError('Failed to load balances data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (
    householdId: string,
    userId: string,
    members: Profile[]
  ) => {
    // Calculate balances based on expense splits
    const { data: serverSplits, error } = await supabase
      .from('expense_splits')
      .select(
        `
        *,
        expenses!inner(*)
      `
      )
      .eq('expenses.household_id', householdId);

    if (error) throw error;

    // Transform server splits to our format
    const transformedSplits: OptimisticSplit[] = (serverSplits || []).map(
      (split) => ({
        id: split.id,
        expense_id: split.expense_id,
        user_id: split.user_id,
        amount_owed: split.amount_owed,
        is_settled: split.is_settled,
        expense: split.expenses,
      })
    );

    setSplits(transformedSplits);
    calculateBalances(transformedSplits, userId, members);
  };

  const calculateBalances = (
    splitsData: OptimisticSplit[],
    userId: string,
    members: Profile[]
  ) => {
    // Create a map to track amounts between user pairs
    const pairBalances = new Map<string, number>();
    const splitsByPair = new Map<string, OptimisticSplit[]>();

    // Process each unsettled split
    splitsData?.forEach((split) => {
      const expense = split.expense;
      if (!split.is_settled) {
        const payerId = expense.paid_by;
        const debtorId = split.user_id;

        // Skip if someone paid for themselves (no debt created)
        if (payerId === debtorId) return;

        const pairKey = `${payerId}-${debtorId}`;

        // Add to the amount this debtor owes this payer
        const currentAmount = pairBalances.get(pairKey) || 0;
        pairBalances.set(pairKey, currentAmount + split.amount_owed);

        // Track related splits for this pair
        if (!splitsByPair.has(pairKey)) {
          splitsByPair.set(pairKey, []);
        }
        splitsByPair.get(pairKey)?.push(split);
      }
    });

    // Convert to balance array with net amounts between users
    const balanceArray: Balance[] = [];
    const processedPairs = new Set<string>();

    // Calculate net balances between each pair of users
    members.forEach((userA) => {
      members.forEach((userB) => {
        if (userA.id === userB.id) return;

        const pairKey = [userA.id, userB.id].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        // Get amounts in both directions
        const aOwesB = pairBalances.get(`${userB.id}-${userA.id}`) || 0; // B paid, A owes
        const bOwesA = pairBalances.get(`${userA.id}-${userB.id}`) || 0; // A paid, B owes

        // Calculate net amount
        const netAmount = bOwesA - aOwesB;

        if (Math.abs(netAmount) > 0.01) {
          // Combine related splits from both directions
          const relatedSplits = [
            ...(splitsByPair.get(`${userA.id}-${userB.id}`) || []),
            ...(splitsByPair.get(`${userB.id}-${userA.id}`) || []),
          ];

          if (netAmount > 0) {
            // B owes A (net)
            balanceArray.push({
              fromUser: userB,
              toUser: userA,
              amount: Math.abs(netAmount),
              related_splits: relatedSplits,
              payment_link: userA.payment_link || undefined,
            });
          } else {
            // A owes B (net)
            balanceArray.push({
              fromUser: userA,
              toUser: userB,
              amount: Math.abs(netAmount),
              related_splits: relatedSplits,
              payment_link: userB.payment_link || undefined,
            });
          }
        }
      });
    });

    setBalances(balanceArray);
  };

  // Helper function to create a complete expense object for optimistic updates
  const createOptimisticExpense = (
    expenseId: string,
    expenseData: {
      amount: number;
      paid_by: string;
      household_id: string;
      date: string;
      split_type: 'equal' | 'custom';
      custom_splits?: { user_id: string; amount: number }[];
      description?: string;
      category?: string;
    }
  ): Expense => {
    return {
      id: expenseId,
      household_id: expenseData.household_id,
      paid_by: expenseData.paid_by,
      amount: expenseData.amount,
      date: expenseData.date,
      category: expenseData.category || null,
      created_at: new Date().toISOString(),
      description: expenseData.description || '',
      split_type: expenseData.split_type,
      updated_at: new Date().toISOString(),
    };
  };

  // Optimistic functions to update balances immediately
  const addOptimisticExpense = (
    expenseId: string,
    expenseData: {
      amount: number;
      paid_by: string;
      household_id: string;
      date: string;
      split_type: 'equal' | 'custom';
      custom_splits?: { user_id: string; amount: number }[];
      description?: string;
      category?: string;
    }
  ) => {
    if (!currentUser) return;

    const optimisticExpense = createOptimisticExpense(expenseId, expenseData);
    let newSplits: OptimisticSplit[] = [];

    if (expenseData.split_type === 'equal') {
      const splitAmount = expenseData.amount / householdMembers.length;
      newSplits = householdMembers.map((member, index) => ({
        id: `temp-split-${expenseId}-${member.id}`,
        expense_id: expenseId,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === expenseData.paid_by,
        expense: optimisticExpense,
      }));
    } else if (
      expenseData.split_type === 'custom' &&
      expenseData.custom_splits
    ) {
      newSplits = expenseData.custom_splits.map((split, index) => ({
        id: `temp-split-${expenseId}-${split.user_id}`,
        expense_id: expenseId,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === expenseData.paid_by,
        expense: optimisticExpense,
      }));
    }

    const updatedSplits = [...splits, ...newSplits];
    setSplits(updatedSplits);
    calculateBalances(updatedSplits, currentUser.id, householdMembers);
  };

  const updateOptimisticExpense = (
    expenseId: string,
    expenseData: {
      amount: number;
      paid_by: string;
      household_id: string;
      date: string;
      split_type: 'equal' | 'custom';
      custom_splits?: { user_id: string; amount: number }[];
      description?: string;
      category?: string;
    }
  ) => {
    if (!currentUser) return;

    // Remove old splits for this expense
    const filteredSplits = splits.filter(
      (split) => split.expense_id !== expenseId
    );

    const optimisticExpense = createOptimisticExpense(expenseId, expenseData);
    let newSplits: OptimisticSplit[] = [];

    if (expenseData.split_type === 'equal') {
      const splitAmount = expenseData.amount / householdMembers.length;
      newSplits = householdMembers.map((member) => ({
        id: `updated-split-${expenseId}-${member.id}`,
        expense_id: expenseId,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === expenseData.paid_by,
        expense: optimisticExpense,
      }));
    } else if (
      expenseData.split_type === 'custom' &&
      expenseData.custom_splits
    ) {
      newSplits = expenseData.custom_splits.map((split) => ({
        id: `updated-split-${expenseId}-${split.user_id}`,
        expense_id: expenseId,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === expenseData.paid_by,
        expense: optimisticExpense,
      }));
    }

    const updatedSplits = [...filteredSplits, ...newSplits];
    setSplits(updatedSplits);
    calculateBalances(updatedSplits, currentUser.id, householdMembers);
  };

  const removeOptimisticExpense = (expenseId: string) => {
    if (!currentUser) return;

    const updatedSplits = splits.filter(
      (split) => split.expense_id !== expenseId
    );
    setSplits(updatedSplits);
    calculateBalances(updatedSplits, currentUser.id, householdMembers);
  };

  const settleOptimisticExpense = (
    expenseId: string,
    userId: string,
    isPayer: boolean
  ) => {
    if (!currentUser) return;

    const updatedSplits = splits.map((split) => {
      if (split.expense_id === expenseId) {
        if (isPayer) {
          // If payer is settling, mark all splits as settled
          return { ...split, is_settled: true };
        } else if (split.user_id === userId) {
          // If user is settling their own split
          return { ...split, is_settled: true };
        }
      }
      return split;
    });

    setSplits(updatedSplits);
    calculateBalances(updatedSplits, currentUser.id, householdMembers);
  };

  // Get balances involving the current user
  const yourBalances = balances.filter(
    (balance) =>
      balance.fromUser.id === currentUser?.id ||
      balance.toUser.id === currentUser?.id
  );

  // Calculate your net balance (positive if you're owed money, negative if you owe)
  const yourNetBalance = yourBalances.reduce((net, balance) => {
    if (balance.fromUser.id === currentUser?.id) {
      // You owe this amount (negative contribution to net)
      return net - balance.amount;
    } else {
      // You're owed this amount (positive contribution to net)
      return net + balance.amount;
    }
  }, 0);

  useEffect(() => {
    loadData();
  }, []);

  return {
    balances,
    yourBalances,
    yourNetBalance,
    householdMembers,
    currentUser,
    loading,
    error,
    refreshData: loadData,
    // Optimistic update functions
    addOptimisticExpense,
    updateOptimisticExpense,
    removeOptimisticExpense,
    settleOptimisticExpense,
  };
}
