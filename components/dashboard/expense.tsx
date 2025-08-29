'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpensesList } from '@/hooks/use-expense-list';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { formatDate } from '@/utils';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { LoadingSpinner } from '../household/loading';

interface RecentExpensesProps {
  userId: string;
  householdId: string;
}

const RecentExpenses = ({ userId, householdId }: RecentExpensesProps) => {
  const { members } = useHouseholdMembers(householdId);
  const { expenses, loading } = useExpensesList(
    householdId,
    userId,
    members,
    5
  );

  if (loading) return <LoadingSpinner />;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 12,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: {
        duration: 0.15,
      },
    },
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

  const amountVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.2,
        delay: 0.05,
      },
    },
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            <CardTitle>Recent Expenses</CardTitle>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            whileTap={{ scale: 0.96 }}
          >
            <Link href="/expenses">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </motion.div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {expenses.length === 0 ? (
              <motion.p
                key="empty-state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-muted-foreground text-center py-8"
              >
                No expenses logged yet. Start tracking your household expenses!
              </motion.p>
            ) : (
              <motion.div
                key="expenses-list"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <AnimatePresence>
                  {expenses.map((expense, index) => (
                    <motion.div
                      key={expense.id}
                      variants={itemVariants}
                      layout
                      whileTap={{
                        scale: 0.98,
                        transition: { duration: 0.1 },
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-accent/40 active:bg-accent/60 cursor-pointer transition-colors touch-manipulation"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25 }}
                      >
                        <motion.h4
                          className="font-medium"
                          layoutId={`description-${expense.id}`}
                        >
                          {expense.description}
                        </motion.h4>
                        <motion.p
                          className="text-sm text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            delay: 0.05 + index * 0.03,
                            duration: 0.2,
                          }}
                        >
                          Paid by {expense.payer?.full_name} •{' '}
                          {formatDate(expense.date)}
                        </motion.p>
                      </motion.div>
                      <motion.div
                        className="text-right"
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.02 + index * 0.03,
                          duration: 0.25,
                        }}
                      >
                        <motion.p
                          variants={amountVariants}
                          initial="initial"
                          animate="animate"
                          className="font-semibold text-lg"
                          layoutId={`amount-${expense.id}`}
                        >
                          ${Number(expense.amount).toFixed(2)}
                        </motion.p>
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RecentExpenses;
