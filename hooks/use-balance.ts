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

    // Create a map to track amounts between user pairs
    // Key format: "payerId-debtorId", Value: amount owed
    const pairBalances = new Map<string, number>();
    const splitsByPair = new Map<string, any[]>();

    // Process each unsettled split
    splits?.forEach((split) => {
      const expense = split.expenses;
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
        splitsByPair.get(pairKey)?.push({
          ...split,
          expense: expense,
        });
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
              from_user_id: userB.id,
              from_user_name:
                userB.id === userId ? 'You' : userB.full_name || '',
              to_user_id: userA.id,
              to_user_name: userA.id === userId ? 'You' : userA.full_name || '',
              amount: Math.abs(netAmount),
              related_splits: relatedSplits,
            });
          } else {
            // A owes B (net)
            balanceArray.push({
              from_user_id: userA.id,
              from_user_name:
                userA.id === userId ? 'You' : userA.full_name || '',
              to_user_id: userB.id,
              to_user_name: userB.id === userId ? 'You' : userB.full_name || '',
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
  };
}
