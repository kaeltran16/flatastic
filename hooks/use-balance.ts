// hooks/useBalances.ts - Refactored with best practices
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/client';
import { Expense, ExpenseSplit, Profile } from '@/lib/supabase/schema.alias';
import { Balance } from '@/lib/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { useHouseholdMembers } from './use-household-member';
import { useProfile } from './use-profile';

// Types for balance calculation
interface SplitWithExpense extends Omit<ExpenseSplit, 'created_at'> {
  expense: Expense;
}

// Fetch function for balances
async function fetchBalances(
  householdId: string,
  userId: string,
  members: Profile[]
): Promise<{
  balances: Balance[];
  yourBalances: Balance[];
  yourNetBalance: number;
}> {
  const supabase = createClient();

  // Get all expense splits for the household
  const { data: serverSplits, error } = await supabase
    .from('expense_splits')
    .select(
      `
      *,
      expenses!inner(*)
    `
    )
    .eq('expenses.household_id', householdId);

  if (error) throw new Error(`Failed to fetch balances: ${error.message}`);

  // Transform server splits to our format
  const splitsData: SplitWithExpense[] = (serverSplits || []).map((split) => ({
    id: split.id,
    expense_id: split.expense_id,
    user_id: split.user_id,
    amount_owed: split.amount_owed,
    is_settled: split.is_settled,
    expense: split.expenses,
  }));

  // Calculate balances
  const balances = calculateBalances(splitsData, members);

  // Get balances involving the current user
  const yourBalances = balances.filter(
    (balance) => balance.fromUser.id === userId || balance.toUser.id === userId
  );

  // Calculate net balance (positive if owed money, negative if owing)
  const yourNetBalance = yourBalances.reduce((net, balance) => {
    if (balance.fromUser.id === userId) {
      return net - balance.amount; // You owe this amount
    } else {
      return net + balance.amount; // You're owed this amount
    }
  }, 0);

  return {
    balances,
    yourBalances,
    yourNetBalance,
  };
}

// Calculate balances from splits data
function calculateBalances(
  splitsData: SplitWithExpense[],
  members: Profile[]
): Balance[] {
  // Create a map to track amounts between user pairs
  const pairBalances = new Map<string, number>();
  const splitsByPair = new Map<string, SplitWithExpense[]>();

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
      const aOwesB = pairBalances.get(`${userB.id}-${userA.id}`) || 0;
      const bOwesA = pairBalances.get(`${userA.id}-${userB.id}`) || 0;

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

  return balanceArray;
}

export function useBalances() {
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
    data: balanceData,
    isLoading: balancesLoading,
    error: balancesError,
  } = useQuery({
    queryKey: queryKeys.balances.household(currentUser?.household_id!),
    queryFn: () =>
      fetchBalances(
        currentUser!.household_id!,
        currentUser!.id,
        householdMembers
      ),
    enabled: !!currentUser?.household_id && householdMembers.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const loading = profileLoading || membersLoading || balancesLoading;
  const error = profileError || membersError || balancesError;

  return {
    balances: balanceData?.balances || [],
    yourBalances: balanceData?.yourBalances || [],
    yourNetBalance: balanceData?.yourNetBalance || 0,
    householdMembers,
    currentUser,
    loading,
    error: error?.message || null,
  };
}
