'use client';

import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import BalancesSidebar from '@/components/expense/balance-sidebar';
import { ErrorState, LoadingState } from '@/components/expense/error';
import ExpenseFilters from '@/components/expense/filter';
import ExpenseList from '@/components/expense/list';
import ExpenseStatsCards from '@/components/expense/stats-card';
import { useBalances } from '@/hooks/use-balance';
import { useExpenses } from '@/hooks/use-expense';
import { ExpenseWithDetails } from '@/lib/supabase/types';

export default function ExpensesPage() {
  const {
    expenses,
    currentUser,
    loading: expensesLoading,
    error: expensesError,
    stats,
    addExpense,
    settleExpense,
    refreshData: refreshExpenses,
  } = useExpenses();

  const {
    balances,
    yourBalances,
    yourNetBalance,
    loading: balancesLoading,
    error: balancesError,
    refreshData: refreshBalances,
  } = useBalances();

  // Combine loading states
  const loading = expensesLoading || balancesLoading || !currentUser;
  const error = expensesError || balancesError;

  // Refresh both expenses and balances
  const refreshData = async () => {
    await Promise.all([refreshExpenses(), refreshBalances()]);
  };

  const handleAddExpense = async (expenseData: ExpenseFormData) => {
    try {
      await addExpense(expenseData);
      // Refresh balances after adding expense
      await refreshBalances();
    } catch (error) {
      console.error('Failed to add expense:', error);
      throw error;
    }
  };

  const handleViewDetails = (expense: ExpenseWithDetails) => {
    // Implement view details logic
    console.log('View details for expense:', expense);
  };

  const handleSettle = async (expense: ExpenseWithDetails) => {
    try {
      await settleExpense(expense);
      // Refresh balances after settling
      await refreshBalances();
    } catch (error) {
      console.error('Failed to settle expense:', error);
      throw error;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Expenses & Payments
          </h1>
          <p className="text-muted-foreground">
            Track shared expenses and manage payments
          </p>
        </div>
        <div className="flex justify-end mb-4">
          <AddExpenseButton
            onExpenseAdded={refreshData}
            onAddExpense={handleAddExpense}
          />
        </div>

        {/* Stats Cards */}
        <ExpenseStatsCards
          totalExpenses={stats.totalExpenses}
          yourTotalShare={stats.yourTotalShare}
          pendingCount={stats.pendingExpenses.length}
          yourNetBalance={yourNetBalance}
          yourBalances={yourBalances}
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
              onExpenseAdded={refreshData}
              onAddExpense={handleAddExpense}
              onViewDetails={handleViewDetails}
              onSettle={handleSettle}
            />
          </div>

          {/* Sidebar */}
          <BalancesSidebar
            balances={balances}
            yourBalances={yourBalances}
            yourNetBalance={yourNetBalance}
            currentUser={currentUser}
            onExpenseAdded={refreshData}
            onAddExpense={handleAddExpense}
          />
        </div>
      </div>
    </div>
  );
}
