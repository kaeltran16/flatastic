'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseWithDetails | null;
  onExpenseDeleted: () => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

const DeleteExpenseDialog: React.FC<DeleteExpenseDialogProps> = ({
  isOpen,
  onOpenChange,
  expense,
  onExpenseDeleted,
  onDeleteExpense,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (!expense) {
      toast.error('No expense to delete');
      return;
    }

    setLoading(true);

    try {
      await onDeleteExpense(expense.id);
      onOpenChange(false);
      onExpenseDeleted();
    } catch (error) {
      console.error('Error deleting expense:', error);
      if (error instanceof Error) {
        toast.error(`Failed to delete expense: ${error.message}`);
      } else {
        toast.error('Failed to delete expense. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    onOpenChange(false);
  };

  // Check if expense can be deleted
  const canDelete =
    expense &&
    expense.splits.some(
      (split) => split.user_id !== expense.paid_by && split.is_settled
    ) === false;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2, ease: 'easeIn' as const },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { ease: 'easeOut' as const } },
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[450px] p-4 sm:p-6">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="flex flex-col"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete Expense
                </DialogTitle>
                <DialogDescription>
                  {!canDelete
                    ? 'This expense cannot be deleted because others have already settled their payments.'
                    : 'This action cannot be undone. The expense and all associated payment records will be permanently deleted.'}
                </DialogDescription>
              </DialogHeader>

              <motion.div variants={childVariants} className="mt-4">
                {!canDelete ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                          Cannot Delete Expense
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          This expense cannot be deleted because other members
                          have already settled their payments. You can only
                          delete expenses where no one else has paid you back
                          yet.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                            You're about to delete:
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-semibold">
                            "{expense.description}"
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Amount: ${expense.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">This will:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Permanently delete the expense record</li>
                        <li>Remove all associated payment splits</li>
                        <li>Cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>

              <DialogFooter className="flex gap-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {canDelete ? 'Cancel' : 'Close'}
                </Button>

                {canDelete && (
                  <motion.div
                    whileHover={{ scale: loading ? 1 : 1.04 }}
                    whileTap={{ scale: loading ? 1 : 0.96 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={handleDelete}
                      disabled={loading}
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {loading ? 'Deleting...' : 'Delete Expense'}
                    </Button>
                  </motion.div>
                )}
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default DeleteExpenseDialog;
