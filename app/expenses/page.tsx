'use client';

import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import BalancesSidebar from '@/components/expense/balance-sidebar';
import { ErrorState } from '@/components/expense/error';
import ExpenseFilters from '@/components/expense/filter';
import ExpenseList from '@/components/expense/list';
import ExpenseStatsCards from '@/components/expense/stats-card';
import { LoadingSpinner } from '@/components/household/loading';
import { useBalances } from '@/hooks/use-balance';
import { useExpenses } from '@/hooks/use-expense';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const [editingExpense, setEditingExpense] =
    useState<ExpenseWithDetails | null>(null);

  const {
    expenses,
    currentUser,
    loading: expensesLoading,
    error: expensesError,
    stats,
    addExpense,
    editExpense,
    deleteExpense,
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
      toast.success('Expense added successfully');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Failed to add expense');
      throw error;
    }
  };

  const handleEditExpense = async (expenseData: ExpenseFormData) => {
    if (!editingExpense) return;

    try {
      await editExpense(editingExpense.id, expenseData);
      // Refresh balances after editing expense
      await refreshBalances();
      setEditingExpense(null);
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Failed to edit expense:', error);
      toast.error('Failed to update expense');
      throw error;
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      // Refresh balances after deleting expense
      await refreshBalances();
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
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
      toast.success('Payment recorded successfully');
    } catch (error) {
      console.error('Failed to settle expense:', error);
      toast.error('Failed to record payment');
      throw error;
    }
  };

  const handleEditClick = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
  };

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const sidebarVariants = {
    hidden: {
      opacity: 0,
      x: 50,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <ErrorState error={error} />
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="min-h-screen bg-background"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {/* Header */}
          <motion.div className="mb-6 sm:mb-8" variants={headerVariants}>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Expenses & Payments
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Track shared expenses and manage payments
            </p>
          </motion.div>

          {/* Add Expense Button */}
          <motion.div
            className="flex justify-end mb-4 sm:mb-6"
            variants={itemVariants}
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <AddExpenseButton
                onExpenseAdded={refreshData}
                onAddExpense={
                  editingExpense ? handleEditExpense : handleAddExpense
                }
                editingExpense={editingExpense}
                onCancelEdit={() => setEditingExpense(null)}
              />
            </motion.div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <ExpenseStatsCards
              totalExpenses={stats.totalExpenses}
              yourTotalShare={stats.yourTotalShare}
              pendingCount={stats.pendingExpenses.length}
              yourNetBalance={yourNetBalance}
              yourBalances={yourBalances}
            />
          </motion.div>

          {/* Main Grid Layout */}
          <motion.div
            className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-6 sm:mt-8"
            variants={gridVariants}
          >
            {/* Main Content */}
            <motion.div
              className="xl:col-span-2 space-y-4 sm:space-y-6"
              variants={containerVariants}
            >
              {/* Filters */}
              <motion.div variants={itemVariants} className="w-full">
                <ExpenseFilters />
              </motion.div>

              {/* Expenses List */}
              <motion.div variants={itemVariants} className="w-full">
                <ExpenseList
                  expenses={expenses}
                  currentUser={currentUser}
                  onExpenseAdded={refreshData}
                  onAddExpense={handleAddExpense}
                  onViewDetails={handleViewDetails}
                  onSettle={handleSettle}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteExpense}
                />
              </motion.div>
            </motion.div>
          </motion.div>
          {/* Sidebar */}
          <motion.div
            className="xl:col-span-1 order-first xl:order-last"
            variants={sidebarVariants}
          >
            <div className="sticky top-4">
              <BalancesSidebar
                balances={balances}
                yourBalances={yourBalances}
                yourNetBalance={yourNetBalance}
                currentUser={currentUser}
                onExpenseAdded={refreshData}
                onAddExpense={handleAddExpense}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
