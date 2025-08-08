// hooks/useBalances.ts
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/schema.alias';
import { Balance } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

export function useBalances() {
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
    const { data: splits, error } = await supabase
      .from('expense_splits')
      .select(
        `
        *,
        expenses!inner(household_id, paid_by, amount, date)
      `
      )
      .eq('expenses.household_id', householdId);

    if (error) throw error;

    const userBalances = new Map<string, number>();
    const splitsByUsers = new Map<string, any[]>();

    // Initialize balances for all members
    members.forEach((member) => {
      userBalances.set(member.id, 0);
      splitsByUsers.set(member.id, []);
    });

    // Calculate net balances and group splits
    splits?.forEach((split) => {
      const expense = split.expenses;
      if (!split.is_settled) {
        // User owes money for this split
        const currentBalance = userBalances.get(split.user_id) || 0;
        userBalances.set(split.user_id, currentBalance - split.amount_owed);

        // Payer is owed money for this split
        const payerBalance = userBalances.get(expense.paid_by) || 0;
        userBalances.set(expense.paid_by, payerBalance + split.amount_owed);

        // Group splits by user pairs
        const userSplits = splitsByUsers.get(split.user_id) || [];
        userSplits.push({
          ...split,
          expense: expense,
        });
        splitsByUsers.set(split.user_id, userSplits);
      }
    });

    // Convert to balance array with relationships
    const balanceArray: Balance[] = [];
    const processedPairs = new Set<string>();

    members.forEach((fromUser) => {
      members.forEach((toUser) => {
        if (fromUser.id === toUser.id) return;

        const pairKey = [fromUser.id, toUser.id].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);

        const fromBalance = userBalances.get(fromUser.id) || 0;
        const toBalance = userBalances.get(toUser.id) || 0;

        // Calculate net amount between the two users
        const netAmount = fromBalance - toBalance;

        if (Math.abs(netAmount) > 0.01) {
          // Only include non-zero balances
          const relatedSplits = [
            ...(splitsByUsers.get(fromUser.id) || []),
            ...(splitsByUsers.get(toUser.id) || []),
          ].filter(
            (split) =>
              (split.user_id === fromUser.id &&
                split.expense.paid_by === toUser.id) ||
              (split.user_id === toUser.id &&
                split.expense.paid_by === fromUser.id)
          );

          if (netAmount > 0) {
            // fromUser owes toUser
            balanceArray.push({
              from_user_id: fromUser.id,
              from_user_name:
                fromUser.id === userId ? 'You' : fromUser.full_name || '',
              to_user_id: toUser.id,
              to_user_name:
                toUser.id === userId ? 'You' : toUser.full_name || '',
              amount: Math.abs(netAmount),
              related_splits: relatedSplits,
            });
          } else {
            // toUser owes fromUser
            balanceArray.push({
              from_user_id: toUser.id,
              from_user_name:
                toUser.id === userId ? 'You' : toUser.full_name || '',
              to_user_id: fromUser.id,
              to_user_name:
                fromUser.id === userId ? 'You' : fromUser.full_name || '',
              amount: Math.abs(netAmount),
              related_splits: relatedSplits,
            });
          }
        }
      });
    });

    setBalances(balanceArray);
  };

  // Get balances involving the current user
  const yourBalances = balances.filter(
    (balance) =>
      balance.from_user_id === currentUser?.id ||
      balance.to_user_id === currentUser?.id
  );

  // Calculate your net balance (positive if you're owed money, negative if you owe)
  const yourNetBalance = yourBalances.reduce((net, balance) => {
    if (balance.from_user_id === currentUser?.id) {
      return net - balance.amount; // You owe this amount
    } else {
      return net + balance.amount; // You're owed this amount
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
  };
}
