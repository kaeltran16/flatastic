'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateChore, useHouseholdMembers } from '@/hooks/use-chore';
import { ExpenseFormData, useExpenses } from '@/hooks/use-expense';
import { ChoreFormData } from '@/lib/supabase/types';
import { motion } from 'motion/react';
import ChoreDialog from '../chore/chore-dialog';
import ExpenseDialog from '../expense/expense-dialog';

interface QuickActionsProps {
  userId: string;
  householdId: string;
}

const QuickActions = ({ userId, householdId }: QuickActionsProps) => {
  const createChoreMutation = useCreateChore();
  const { addExpense } = useExpenses();
  const { data: householdMembers = [], isLoading: membersLoading } =
    useHouseholdMembers(householdId);
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

  const buttonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  };

  const handleNewChore = async (formData: ChoreFormData) => {
    try {
      await createChoreMutation.mutateAsync(formData);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to create chore:', error);
    }
  };

  const handleAddExpense = async (expenseData: ExpenseFormData) => {
    try {
      await addExpense(expenseData);
      // No manual refresh needed - optimistic updates handle everything!
    } catch (error) {
      console.error('Failed to add expense:', error);
      throw error;
    }
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card className="overflow-hidden">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            <CardTitle className="flex items-center gap-2">
              Quick Actions
            </CardTitle>
          </motion.div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChoreDialog
            mode="create"
            householdId={householdId}
            currentUserId={userId}
            onSubmit={handleNewChore}
            householdMembers={householdMembers}
          />

          <ExpenseDialog
            mode="create"
            householdId={householdId}
            currentUserId={userId}
            onSubmit={handleAddExpense}
            householdMembers={householdMembers}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickActions;
