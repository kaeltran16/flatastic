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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { Edit, Save } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

export interface ExpenseFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  split_type: 'equal' | 'custom';
}

interface EditExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseWithDetails | null;
  onExpenseEdited: () => void;
  onEditExpense: (
    expenseId: string,
    expenseData: ExpenseFormData
  ) => Promise<void>;
}

const categories = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'household', label: 'Household' },
  { value: 'food', label: 'Food' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

const EditExpenseDialog: React.FC<EditExpenseDialogProps> = ({
  isOpen,
  onOpenChange,
  expense,
  onExpenseEdited,
  onEditExpense,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    split_type: 'equal',
  });

  // Populate form with expense data when dialog opens
  useEffect(() => {
    if (expense && isOpen) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category || '',
        date: expense.date,
        split_type: expense.split_type as 'equal' | 'custom',
      });
    }
  }, [expense, isOpen]);

  const handleInputChange = (
    field: keyof ExpenseFormData,
    value: string
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = (): void => {
    if (expense) {
      setFormData({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category || '',
        date: expense.date,
        split_type: expense.split_type as 'equal' | 'custom',
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return false;
    }
    if (!formData.category) {
      alert('Please select a category');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!expense) {
      alert('No expense to edit');
      return;
    }

    if (!validateForm()) return;
    setLoading(true);

    try {
      await onEditExpense(expense.id, formData);

      onOpenChange(false);
      onExpenseEdited();
    } catch (error) {
      console.error('Error editing expense:', error);
      if (error instanceof Error) {
        alert(`Failed to edit expense: ${error.message}`);
      } else {
        alert('Failed to edit expense. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    resetForm();
    onOpenChange(false);
  };

  // Check if expense can be edited
  const canEdit =
    expense &&
    expense.splits.some(
      (split) => split.user_id !== expense.paid_by && split.is_settled
    ) === false;

  // Variants for container and children
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
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="flex flex-col"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Expense
                </DialogTitle>
                <DialogDescription>
                  {!canEdit
                    ? 'This expense cannot be edited because others have already settled their payments.'
                    : 'Update the expense details. Note that changing the amount will reset all payment statuses except yours.'}
                </DialogDescription>
              </DialogHeader>

              {!canEdit ? (
                <motion.div
                  variants={childVariants}
                  className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This expense cannot be edited because other members have
                    already settled their payments. You can only edit expenses
                    where no one else has paid you back yet.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  <motion.div variants={childVariants} className="space-y-2">
                    <Label
                      htmlFor="edit-description"
                      className="text-sm font-medium"
                    >
                      Description *
                    </Label>
                    <Input
                      id="edit-description"
                      placeholder="e.g., Weekly groceries, Internet bill"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange('description', e.target.value)
                      }
                      disabled={loading}
                      required
                    />
                  </motion.div>

                  <motion.div
                    variants={childVariants}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-amount"
                        className="text-sm font-medium"
                      >
                        Amount *
                      </Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) =>
                          handleInputChange('amount', e.target.value)
                        }
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-date"
                        className="text-sm font-medium"
                      >
                        Date *
                      </Label>
                      <Input
                        id="edit-date"
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          handleInputChange('date', e.target.value)
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={childVariants} className="space-y-2">
                    <Label
                      htmlFor="edit-category"
                      className="text-sm font-medium"
                    >
                      Category *
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        handleInputChange('category', value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div variants={childVariants} className="space-y-2">
                    <Label
                      htmlFor="edit-split-type"
                      className="text-sm font-medium"
                    >
                      Split Type
                    </Label>
                    <Select
                      value={formData.split_type}
                      onValueChange={(value: 'equal' | 'custom') =>
                        handleInputChange('split_type', value)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Split Equally</SelectItem>
                        <SelectItem value="custom" disabled>
                          Custom Split (Coming Soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <DialogFooter className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <motion.div
                      whileHover={{ scale: loading ? 1 : 1.04 }}
                      whileTap={{ scale: loading ? 1 : 0.96 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gray-900 w-full hover:bg-gray-800 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </form>
              )}

              {!canEdit && (
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              )}
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default EditExpenseDialog;
