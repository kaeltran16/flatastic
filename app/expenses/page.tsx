'use client';

import { ErrorState } from '@/components/expense/error';
import ExpenseDialog from '@/components/expense/expense-dialog';
import ExpenseFilters from '@/components/expense/filter';
import ExpenseList from '@/components/expense/list';
import ExpenseStatsCards from '@/components/expense/stats-card';
import { LoadingSpinner } from '@/components/household/loading';
import { useBalances } from '@/hooks/use-balance';
import { ExpenseFormData, useExpenses } from '@/hooks/use-expense';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

export default function ExpensesPage() {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Initialize balances hook first
  const {
    balances,
    yourBalances,
    yourNetBalance,
    loading: balancesLoading,
    error: balancesError,
  } = useBalances();

  // Pass balance update functions to expenses hook
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
  } = useExpenses();

  const { members: householdMembers } = useHouseholdMembers(
    currentUser?.household_id || null
  );

  // Filter expenses based on current filters
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = expense.description
          ?.toLowerCase()
          .includes(query);
        const matchesCategory = expense.category?.toLowerCase().includes(query);
        const matchesAmount = expense.amount.toString().includes(query);

        if (!matchesDescription && !matchesCategory && !matchesAmount) {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isSettled = expense.status === 'settled';
        if (statusFilter === 'settled' && !isSettled) {
          return false;
        }
        if (statusFilter === 'pending' && isSettled) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, categoryFilter, statusFilter]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalExpenses = filteredExpenses
      .filter(
        (e) =>
          e.created_at &&
          new Date(e.created_at) >=
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    const yourTotalShare = filteredExpenses
      .filter(
        (e) =>
          e.created_at &&
          new Date(e.created_at) >=
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      )
      .reduce((sum, expense) => {
        const yourShare = expense.splits?.find(
          (split) => split.user_id === currentUser?.id
        );
        return sum + (yourShare?.amount_owed || 0);
      }, 0);

    const pendingExpenses = filteredExpenses.filter(
      (expense) => expense.status === 'pending'
    );

    return {
      totalExpenses,
      yourTotalShare,
      pendingExpenses,
    };
  }, [filteredExpenses, currentUser?.id]);

  // Combine loading states
  const loading = expensesLoading || balancesLoading || !currentUser;
  const error = expensesError || balancesError;

  // Filter handlers
  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
  };

  // These handlers now only call the expense functions - no manual refresh needed!
  const handleAddExpense = async (expenseData: ExpenseFormData) => {
    try {
      await addExpense(expenseData);
      // No manual refresh needed - optimistic updates handle everything!
    } catch (error) {
      console.error('Failed to add expense:', error);
      throw error;
    }
  };

  const handleEditExpense = async (
    expenseId: string,
    expenseData: ExpenseFormData
  ) => {
    try {
      await editExpense(expenseId, expenseData);
      // No manual refresh needed - optimistic updates handle everything!
    } catch (error) {
      console.error('Failed to edit expense:', error);
      throw error;
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      // No manual refresh needed - optimistic updates handle everything!
    } catch (error) {
      console.error('Failed to delete expense:', error);
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
      // No manual refresh needed - optimistic updates handle everything!
    } catch (error) {
      console.error('Failed to settle expense:', error);
      throw error;
    }
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
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <ExpenseDialog
              mode="create"
              className="w-full mb-4"
              householdId={currentUser?.household_id || ''}
              currentUserId={currentUser?.id}
              householdMembers={householdMembers}
              onSubmit={async (formData) => {
                await handleAddExpense(formData);
              }}
              isLoading={false}
            />
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={itemVariants}>
            <ExpenseStatsCards
              totalExpenses={filteredStats.totalExpenses}
              yourTotalShare={filteredStats.yourTotalShare}
              pendingCount={filteredStats.pendingExpenses.length}
              yourNetBalance={yourNetBalance}
              yourBalances={yourBalances}
            />
          </motion.div>

          {/* Filters */}
          <motion.div variants={itemVariants} className="w-full">
            <ExpenseFilters
              onSearchChange={handleSearchChange}
              onCategoryChange={handleCategoryChange}
              onStatusChange={handleStatusChange}
            />
          </motion.div>

          {/* Results Summary */}
          {(searchQuery ||
            categoryFilter !== 'all' ||
            statusFilter !== 'all') && (
            <motion.div
              variants={itemVariants}
              className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border"
            >
              Showing {filteredExpenses.length} of {expenses?.length || 0}{' '}
              expenses
              {filteredStats.totalExpenses > 0 && (
                <span className="ml-2">
                  (Total: ${filteredStats.totalExpenses.toFixed(2)})
                </span>
              )}
            </motion.div>
          )}

          {/* Expenses List */}
          <motion.div variants={itemVariants} className="w-full">
            <ExpenseList
              expenses={filteredExpenses}
              currentUser={currentUser}
              householdMembers={householdMembers}
              onAddExpense={handleAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onViewDetails={handleViewDetails}
              onSettle={handleSettle}
            />
          </motion.div>

          {/* No Results Message */}
          {filteredExpenses.length === 0 &&
            expenses &&
            expenses.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="text-center py-12 text-muted-foreground"
              >
                <div className="text-lg font-medium mb-2">
                  No expenses found
                </div>
                <div className="text-sm">
                  Try adjusting your filters or search terms
                </div>
              </motion.div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
