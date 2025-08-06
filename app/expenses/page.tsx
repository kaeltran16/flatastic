'use client';

import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import BalancesSidebar from '@/components/expense/balance-sidebar';
import { ErrorState, LoadingState } from '@/components/expense/error';
import ExpenseFilters from '@/components/expense/filter';
import ExpenseList from '@/components/expense/list';
import ExpensesNavigation from '@/components/expense/navigation';
import ExpenseStatsCards from '@/components/expense/stats-card';
import { createClient } from '@/lib/supabase/client';
import type { Expense, ExpenseSplit, Profile } from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

export interface ExpenseWithDetails extends Expense {
  payer_name: string;
  splits: ExpenseSplit[];
  your_share: number;
  status: 'pending' | 'settled';
}

interface Balance {
  name: string;
  amount: number;
  type: 'owed' | 'owes';
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

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

      // Load expenses and balances
      await loadExpenses(profile.household_id, user.id);
      await loadBalances(profile.household_id, user.id, members || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async (householdId: string, userId: string) => {
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
        const payer = householdMembers.find(
          (member) => member.id === expense.paid_by
        );
        const userSplit = expense.expense_splits.find(
          (split: ExpenseSplit) => split.user_id === userId
        );
        const allSettled = expense.expense_splits.every(
          (split: ExpenseSplit) => split.is_settled
        );

        return {
          ...expense,
          payer_name: payer?.full_name || 'Unknown',
          splits: expense.expense_splits,
          your_share: userSplit?.amount_owed || 0,
          status: allSettled ? 'settled' : 'pending',
        };
      }
    );

    setExpenses(processedExpenses);
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

  const handleAddExpense = async (expenseData: ExpenseFormData) => {
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
  };

  // Calculate stats
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const yourTotalShare = expenses.reduce(
    (sum, expense) => sum + expense.your_share,
    0
  );
  const pendingExpenses = expenses.filter(
    (expense) => expense.status === 'pending'
  );
  const yourBalance = balances.find((balance) => balance.name === 'You');

  // Event handlers
  const handleViewDetails = (expense: ExpenseWithDetails) => {
    // Implement view details logic
    console.log('View details for expense:', expense);
  };

  const handleSettle = (expense: ExpenseWithDetails) => {
    // Implement settle logic
    console.log('Settle expense:', expense);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ExpensesNavigation
        currentUser={currentUser}
        onExpenseAdded={loadData}
        onAddExpense={handleAddExpense}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Expenses & Payments
          </h1>
          <p className="text-muted-foreground">
            Track shared expenses and manage payments
          </p>
        </div>

        {/* Stats Cards */}
        <ExpenseStatsCards
          totalExpenses={totalExpenses}
          yourTotalShare={yourTotalShare}
          pendingCount={pendingExpenses.length}
          yourBalance={yourBalance}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <ExpenseFilters />

            {/* Expenses List */}
            <ExpenseList
              expenses={expenses}
              currentUser={currentUser}
              onExpenseAdded={loadData}
              onAddExpense={handleAddExpense}
              onViewDetails={handleViewDetails}
              onSettle={handleSettle}
            />
          </div>

          {/* Sidebar */}
          <BalancesSidebar
            balances={balances}
            currentUser={currentUser}
            onExpenseAdded={loadData}
            onAddExpense={handleAddExpense}
          />
        </div>
      </div>
    </div>
  );
}
