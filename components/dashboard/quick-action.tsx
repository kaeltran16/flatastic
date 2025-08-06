'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { ExpenseSplit, Profile } from '@/lib/supabase/types';
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AddChoreButton from '../chore/add-chore-button';
import AddExpenseButton from '../expense/add-expense-button';
import { ExpenseFormData } from '../expense/add-expense-dialog';

export interface QuickActionsProps {
  user: Profile;
}

const QuickActions = ({ user }: QuickActionsProps) => {
  const supabase = createClient();

  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHouseholdMembers = async () => {
      if (!user.household_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', user.household_id);

      if (error) {
        console.error('Failed to fetch household members:', error);
        setIsLoading(false);
        return;
      }

      setHouseholdMembers(data || []);
      setIsLoading(false);
    };

    fetchHouseholdMembers();
  }, [user.household_id]);

  const onExpenseAdded = () => {
    // For now: simple reload. Can be improved with toast or optimistic UI
    window.location.reload();
  };

  const onAddExpense = async (expenseData: ExpenseFormData) => {
    if (!user.household_id) throw new Error('No household found');

    // 1. Insert the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        household_id: user.household_id,
        description: expenseData.description.trim(),
        amount: parseFloat(expenseData.amount),
        paid_by: user.id,
        category: expenseData.category,
        date: expenseData.date,
        split_type: expenseData.split_type,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 2. Insert splits (equal only)
    if (expenseData.split_type === 'equal') {
      const splitAmount =
        parseFloat(expenseData.amount) / householdMembers.length;

      const splits: Omit<ExpenseSplit, 'id'>[] = householdMembers.map(
        (member) => ({
          expense_id: expense.id,
          user_id: member.id,
          amount_owed: splitAmount,
          is_settled: member.id === user.id,
          expenses: expense,
          created_at: new Date().toISOString(),
        })
      );

      const { error: splitsError } = await supabase
        .from('expense_splits')
        .insert(splits);

      if (splitsError) throw splitsError;
    }

    console.log('Expense added successfully:', expense.id);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const buttonVariants = {
    hidden: {
      opacity: 0,
      y: 12,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
  };

  const loadingVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.15,
      },
    },
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card className="overflow-hidden">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <CardTitle>Quick Actions</CardTitle>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                variants={loadingVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-muted/50 rounded-md animate-pulse"
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <motion.div
                  variants={buttonVariants}
                  whileTap={{
                    scale: 0.98,
                    transition: { duration: 0.1 },
                  }}
                >
                  <AddChoreButton
                    className="w-full justify-start h-12 touch-manipulation"
                    householdId={user.household_id!}
                    currentUserId={user.id}
                  />
                </motion.div>

                <motion.div
                  variants={buttonVariants}
                  whileTap={{
                    scale: 0.98,
                    transition: { duration: 0.1 },
                  }}
                >
                  <AddExpenseButton
                    className="w-full justify-start h-12 touch-manipulation"
                    onExpenseAdded={onExpenseAdded}
                    onAddExpense={onAddExpense}
                  />
                </motion.div>

                <motion.div
                  variants={buttonVariants}
                  whileTap={{
                    scale: 0.98,
                    transition: { duration: 0.1 },
                  }}
                >
                  <Link href="/household" className="block">
                    <Button
                      className="w-full justify-start bg-transparent h-12 touch-manipulation"
                      variant="outline"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Household
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickActions;
