// hooks/useSettlements.ts
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/schema.alias';
import {
  Balance,
  ExpenseSplitWithExpense,
  Settlement,
} from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

export function useSettlements() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [completedSettlements, setCompletedSettlements] = useState<
    Settlement[]
  >([]);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile>();
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

      // Load balances and completed settlements
      await Promise.all([
        loadBalances(profile.household_id, members || []),
        loadCompletedSettlements(profile.household_id, members || []),
      ]);
    } catch (err) {
      console.error('Error loading settlement data:', err);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedSettlements = async (
    householdId: string,
    members: Profile[]
  ) => {
    try {
      // Get all payment notes for users in this household
      const householdUserIds = members.map((m) => m.id);

      const { data: paymentNotes, error } = await supabase
        .from('payment_notes')
        .select('*')
        .in('from_user_id', householdUserIds)
        .in('to_user_id', householdUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform payment notes into Settlement objects
      const settlements: Settlement[] = (paymentNotes || []).map((note) => {
        const fromUser = members.find((m) => m.id === note.from_user_id);
        const toUser = members.find((m) => m.id === note.to_user_id);

        return {
          ...note,
          from_user_name:
            fromUser?.full_name || fromUser?.email || 'Unknown User',
          to_user_name: toUser?.full_name || toUser?.email || 'Unknown User',
          amount: note.amount,
          note: note.note || '',
          settled_at: note.created_at || new Date().toISOString(),
          created_at: note.created_at || new Date().toISOString(),
          updated_at: note.updated_at || new Date().toISOString(),
        };
      });

      setCompletedSettlements(settlements);
    } catch (error) {
      console.error('Error loading completed settlements:', error);
      // Don't throw here, just log the error and continue with empty settlements
      setCompletedSettlements([]);
    }
  };

  const loadBalances = async (householdId: string, members: Profile[]) => {
    // Get all unsettled expense splits with proper join
    const { data: splits, error } = await supabase
      .from('expense_splits')
      .select(
        `
      *,
      expenses!inner(
        id,
        household_id,
        paid_by,
        description,
        amount,
        date,
        category,
        split_type,
        created_at,
        updated_at
      )
    `
      )
      .eq('expenses.household_id', householdId)
      .eq('is_settled', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Validate data structure
    if (!splits || splits.length === 0) {
      setBalances([]);
      return;
    }

    // Calculate net balances between users
    const userBalances = new Map<
      string,
      Map<string, { amount: number; splits: ExpenseSplitWithExpense[] }>
    >();

    splits.forEach((split) => {
      // Ensure we have the expense data
      if (!split.expenses) {
        console.warn('Split missing expense data:', split);
        return;
      }

      const expense = split.expenses;
      const debtor = split.user_id;
      const creditor = expense.paid_by;

      // Transform the split to match ExpenseSplitWithExpense interface
      const splitWithExpense: ExpenseSplitWithExpense = {
        ...split,
        expense: expense, // Transform 'expenses' to 'expense' to match interface
      };

      // Skip if debtor and creditor are the same (shouldn't happen but safety check)
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
          splits: [...existingBalance.splits, splitWithExpense], // Use transformed split
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
            // Keep original splits if current balance is higher
          }
        }

        // Only create balance if there's actually money owed
        if (netAmount > 0.01) {
          // Use small threshold to avoid floating point issues
          const fromUser = members.find((m) => m.id === netFromUser);
          const toUser = members.find((m) => m.id === netToUser);

          if (fromUser && toUser) {
            balanceArray.push({
              from_user_id: netFromUser,
              from_user_name: fromUser.full_name || fromUser.email,
              to_user_id: netToUser,
              to_user_name: toUser.full_name || toUser.email,
              amount: Math.round(netAmount * 100) / 100, // Round to 2 decimal places
              related_splits: netSplits, // This now correctly has ExpenseSplitWithExpense[]
              payment_link: fromUser.payment_link || '',
            });
          }
        }

        processed.add(key1);
        processed.add(key2);
      }
    }

    // Sort balances by amount (highest first)
    balanceArray.sort((a, b) => b.amount - a.amount);
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

    // Use a transaction-like approach with error handling
    const updates: {
      id: string;
      operation: 'settle' | 'update';
      newAmount?: number;
    }[] = [];

    try {
      // Sort splits by amount owed (descending) to settle larger amounts first
      const sortedSplits = [...balance.related_splits].sort(
        (a, b) => b.amount_owed - a.amount_owed
      );

      let remainingAmount = amount;

      // Determine which splits to update or settle
      for (const split of sortedSplits) {
        if (remainingAmount <= 0) break;

        if (remainingAmount >= split.amount_owed) {
          // Fully settle this split
          remainingAmount -= split.amount_owed;
          updates.push({
            id: split.id,
            operation: 'settle',
          });
        } else {
          // Partially settle this split
          updates.push({
            id: split.id,
            operation: 'update',
            newAmount: split.amount_owed - remainingAmount,
          });
          remainingAmount = 0;
        }
      }

      // Execute all updates
      for (const update of updates) {
        if (update.operation === 'settle') {
          const { error } = await supabase
            .from('expense_splits')
            .update({ is_settled: true })
            .eq('id', update.id);

          if (error) throw error;
        } else if (
          update.operation === 'update' &&
          update.newAmount !== undefined
        ) {
          const { error } = await supabase
            .from('expense_splits')
            .update({ amount_owed: update.newAmount })
            .eq('id', update.id);

          if (error) throw error;
        }
      }

      // Create a payment record for history tracking
      const { error: noteError } = await supabase.from('payment_notes').insert({
        from_user_id: balance.from_user_id,
        to_user_id: balance.to_user_id,
        amount: amount,
        note: note || '',
        created_at: new Date().toISOString(),
      });

      // Don't throw on note errors, just log them
      if (noteError) {
        console.warn('Failed to save payment note:', noteError);
      }

      // Wait a bit to ensure database consistency, then refresh
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadData();
    } catch (error) {
      // If any update fails, we should ideally rollback, but Supabase doesn't have transactions
      // In a real app, you'd want to implement a rollback mechanism or use a backend with transactions
      console.error('Settlement failed:', error);

      // Refresh data to get current state
      await loadData();
      throw error;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    balances,
    completedSettlements,
    householdMembers,
    currentUser,
    loading,
    error,
    settlePayment,
    refreshData: loadData,
  };
}
