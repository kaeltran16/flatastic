// hooks/useSettlements.ts
import { createClient } from '@/lib/supabase/client';
import type { ExpenseSplit, Profile } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

interface Balance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
  related_splits: ExpenseSplit[];
}

export function useSettlements() {
  const [balances, setBalances] = useState<Balance[]>([]);
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

      // Load balances
      await loadBalances(profile.household_id, members || []);
    } catch (err) {
      console.error('Error loading settlement data:', err);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (householdId: string, members: Profile[]) => {
    // Get all unsettled expense splits
    const { data: splits, error } = await supabase
      .from('expense_splits')
      .select(
        `
        *,
        expenses!inner(household_id, paid_by, description, amount, date)
      `
      )
      .eq('expenses.household_id', householdId)
      .eq('is_settled', false);

    if (error) throw error;

    // Calculate net balances between users
    const userBalances = new Map<
      string,
      Map<string, { amount: number; splits: ExpenseSplit[] }>
    >();

    splits?.forEach((split) => {
      const expense = split.expenses;
      const debtor = split.user_id;
      const creditor = expense.paid_by;

      if (debtor !== creditor) {
        if (!userBalances.has(debtor)) {
          userBalances.set(debtor, new Map());
        }

        const debtorBalances = userBalances.get(debtor)!;
        const existingBalance = debtorBalances.get(creditor) || {
          amount: 0,
          splits: [],
        };

        debtorBalances.set(creditor, {
          amount: existingBalance.amount + split.amount_owed,
          splits: [...existingBalance.splits, split],
        });
      }
    });

    // Convert to balance array and net out mutual debts
    const balanceArray: Balance[] = [];
    const processed = new Set<string>();

    for (const [debtorId, creditorMap] of userBalances.entries()) {
      for (const [creditorId, data] of creditorMap.entries()) {
        const key1 = `${debtorId}-${creditorId}`;
        const key2 = `${creditorId}-${debtorId}`;

        if (processed.has(key1) || processed.has(key2)) continue;

        const reverseBalance = userBalances.get(creditorId)?.get(debtorId);
        let netAmount = data.amount;
        let netFromUser = debtorId;
        let netToUser = creditorId;
        let netSplits = data.splits;

        if (reverseBalance) {
          if (reverseBalance.amount > data.amount) {
            netAmount = reverseBalance.amount - data.amount;
            netFromUser = creditorId;
            netToUser = debtorId;
            netSplits = reverseBalance.splits;
          } else {
            netAmount = data.amount - reverseBalance.amount;
          }
        }

        if (netAmount > 0) {
          const fromUser = members.find((m) => m.id === netFromUser);
          const toUser = members.find((m) => m.id === netToUser);

          if (fromUser && toUser) {
            balanceArray.push({
              from_user_id: netFromUser,
              from_user_name: fromUser.full_name,
              to_user_id: netToUser,
              to_user_name: toUser.full_name,
              amount: netAmount,
              related_splits: netSplits,
            });
          }
        }

        processed.add(key1);
        processed.add(key2);
      }
    }

    setBalances(balanceArray);
  };

  const settlePayment = async (
    balance: Balance,
    amount: number,
    note?: string
  ) => {
    if (amount <= 0 || amount > balance.amount) {
      throw new Error('Invalid payment amount');
    }

    // Sort splits by amount owed (descending) to settle larger amounts first
    const sortedSplits = [...balance.related_splits].sort(
      (a, b) => b.amount_owed - a.amount_owed
    );

    let remainingAmount = amount;
    const splitsToUpdate: {
      id: string;
      newAmount: number;
      shouldSettle: boolean;
    }[] = [];

    // Determine which splits to update or settle
    for (const split of sortedSplits) {
      if (remainingAmount <= 0) break;

      if (remainingAmount >= split.amount_owed) {
        // Fully settle this split
        remainingAmount -= split.amount_owed;
        splitsToUpdate.push({
          id: split.id,
          newAmount: 0,
          shouldSettle: true,
        });
      } else {
        // Partially settle this split
        splitsToUpdate.push({
          id: split.id,
          newAmount: split.amount_owed - remainingAmount,
          shouldSettle: false,
        });
        remainingAmount = 0;
      }
    }

    // Update the database
    for (const update of splitsToUpdate) {
      if (update.shouldSettle) {
        // Mark as settled
        const { error } = await supabase
          .from('expense_splits')
          .update({ is_settled: true })
          .eq('id', update.id);

        if (error) throw error;
      } else {
        // Update the amount owed
        const { error } = await supabase
          .from('expense_splits')
          .update({ amount_owed: update.newAmount })
          .eq('id', update.id);

        if (error) throw error;
      }
    }

    // Refresh data after settlement
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    balances,
    householdMembers,
    currentUser,
    loading,
    error,
    settlePayment,
    refreshData: loadData,
  };
}
