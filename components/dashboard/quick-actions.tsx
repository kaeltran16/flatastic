'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateChore } from '@/hooks/use-chore';
import { ExpenseFormData, useExpenses } from '@/hooks/use-expense';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { ChoreFormData } from '@/lib/supabase/types';
import { ClipboardList, Receipt } from 'lucide-react';
import { motion } from 'motion/react';
import ChoreDialog from '../chore/chore-dialog';
import ExpenseDialog from '../expense/expense-dialog';
import { Button } from '../ui/button';

interface QuickActionsProps {
  userId: string;
  householdId: string;
}

const QuickActions = ({ userId, householdId }: QuickActionsProps) => {
  const createChoreMutation = useCreateChore();
  const { addExpense } = useExpenses();
  const { members: householdMembers } = useHouseholdMembers(householdId);
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
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Add Chore</p>
                  <p className="text-xs text-muted-foreground">
                    Create a new household task
                  </p>
                </div>
              </Button>
            </motion.div>
          </ChoreDialog>

          <ExpenseDialog
            mode="create"
            householdId={householdId}
            currentUserId={userId}
            onSubmit={handleAddExpense}
            householdMembers={householdMembers}
          >
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
              >
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Add Expense</p>
                  <p className="text-xs text-muted-foreground">
                    Log a new household expense
                  </p>
                </div>
              </Button>
            </motion.div>
          </ExpenseDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuickActions;
