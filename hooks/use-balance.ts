// hooks/useBalances.ts
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

interface Balance {
  name: string;
  amount: number;
  type: 'owed' | 'owes';
}

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
        expenses!inner(household_id, paid_by)
      `
      )
      .eq('expenses.household_id', householdId);

    if (error) throw error;

    const userBalances = new Map<string, number>();

    // Initialize balances for all members
    members.forEach((member) => {
      userBalances.set(member.id, 0);
    });

    // Calculate net balances
    splits?.forEach((split) => {
      const expense = split.expenses;
      if (!split.is_settled) {
        // User owes money for this split
        const currentBalance = userBalances.get(split.user_id) || 0;
        userBalances.set(split.user_id, currentBalance - split.amount_owed);

        // Payer is owed money for this split
        const payerBalance = userBalances.get(expense.paid_by) || 0;
        userBalances.set(expense.paid_by, payerBalance + split.amount_owed);
      }
    });

    // Convert to balance array
    const balanceArray: Balance[] = members
      .map((member) => {
        const balance = userBalances.get(member.id) || 0;
        return {
          name: member.id === userId ? 'You' : member.full_name,
          amount: Math.abs(balance),
          type: balance >= 0 ? ('owed' as const) : ('owes' as const),
        };
      })
      .filter((balance) => balance.amount > 0);

    setBalances(balanceArray);
  };

  // Get the current user's balance
  const yourBalance = balances.find((balance) => balance.name === 'You');

  useEffect(() => {
    loadData();
  }, []);

  return {
    balances,
    yourBalance,
    householdMembers,
    currentUser,
    loading,
    error,
    refreshData: loadData,
  };
}
