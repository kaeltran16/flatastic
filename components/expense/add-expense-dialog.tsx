'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Profile } from '@/lib/supabase/schema.alias';
import { AlertCircle, DollarSign, Plus, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface CustomSplit {
  user_id: string;
  amount: number;
}

export interface ExpenseFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  split_type: 'equal' | 'custom';
  custom_splits?: CustomSplit[];
  selected_users?: string[];
}

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (expenseData: ExpenseFormData) => Promise<void>;
  householdMembers: Profile[];
  currentUser: Profile | null;
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

const AddExpenseDialog: React.FC<AddExpenseDialogProps> = ({
  isOpen,
  onOpenChange,
  onAddExpense,
  householdMembers,
  currentUser,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    split_type: 'equal',
    custom_splits: [],
    selected_users: [],
  });

  const [customSplits, setCustomSplits] = useState<{
    [userId: string]: string;
  }>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Reset custom splits when split type changes or dialog opens
  useEffect(() => {
    if (formData.split_type === 'equal') {
      setCustomSplits({});
      setSelectedUsers(new Set());
    } else if (formData.split_type === 'custom' && currentUser) {
      // Initialize with current user selected
      setSelectedUsers(new Set([currentUser.id]));
      setCustomSplits({ [currentUser.id]: '' });
    }
  }, [formData.split_type, currentUser]);

  // Auto-calculate remaining amount for custom splits
  useEffect(() => {
    if (formData.split_type === 'custom' && formData.amount) {
      const totalAmount = parseFloat(formData.amount) || 0;
      const assignedAmount = Object.values(customSplits).reduce(
        (sum, amount) => {
          return sum + (parseFloat(amount) || 0);
        },
        0
      );
      const remainingAmount = totalAmount - assignedAmount;

      // If there's exactly one user without an amount, auto-fill it
      const usersWithoutAmount = Array.from(selectedUsers).filter(
        (userId) => !customSplits[userId] || customSplits[userId] === ''
      );

      if (usersWithoutAmount.length === 1 && remainingAmount > 0) {
        setCustomSplits((prev) => ({
          ...prev,
          [usersWithoutAmount[0]]: remainingAmount.toFixed(2),
        }));
      }
    }
  }, [customSplits, selectedUsers, formData.amount, formData.split_type]);

  const handleInputChange = (
    field: keyof ExpenseFormData,
    value: string
  ): void => {
    value = value.replace(',', '.');

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelectedUsers = new Set(selectedUsers);
    const newCustomSplits = { ...customSplits };

    if (checked) {
      newSelectedUsers.add(userId);
      if (!newCustomSplits[userId]) {
        newCustomSplits[userId] = '';
      }
    } else {
      newSelectedUsers.delete(userId);
      delete newCustomSplits[userId];
    }

    setSelectedUsers(newSelectedUsers);
    setCustomSplits(newCustomSplits);
  };

  const handleCustomSplitChange = (userId: string, amount: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: amount,
    }));
  };

  const resetForm = (): void => {
    setFormData({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      split_type: 'equal',
      custom_splits: [],
      selected_users: [],
    });
    setCustomSplits({});
    setSelectedUsers(new Set());
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) < 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return false;
    }

    if (formData.split_type === 'custom') {
      if (selectedUsers.size === 0) {
        toast.error('Please select at least one user for custom split');
        return false;
      }

      // Check if all selected users have amounts
      for (const userId of selectedUsers) {
        if (!customSplits[userId] || parseFloat(customSplits[userId]) < 0) {
          toast.error('Please enter valid amounts for all selected users');
          return false;
        }
      }

      // Check if amounts add up to total
      const totalAmount = parseFloat(formData.amount);
      const splitTotal = Object.values(customSplits).reduce((sum, amount) => {
        return sum + (parseFloat(amount) || 0);
      }, 0);

      if (Math.abs(splitTotal - totalAmount) > 0.01) {
        toast.error(
          `Split amounts ($${splitTotal.toFixed(
            2
          )}) must equal the total expense amount ($${totalAmount.toFixed(2)})`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) return;
    setLoading(true);

    try {
      const expenseData: ExpenseFormData = {
        ...formData,
      };

      if (formData.split_type === 'custom') {
        expenseData.custom_splits = Array.from(selectedUsers).map((userId) => ({
          user_id: userId,
          amount: parseFloat(customSplits[userId]),
        }));
        expenseData.selected_users = Array.from(selectedUsers);
      }

      await onAddExpense(expenseData);

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to add expense. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (): void => {
    resetForm();
    onOpenChange(false);
  };

  // Calculate totals for custom split
  const totalAmount = parseFloat(formData.amount) || 0;
  const assignedAmount = Object.values(customSplits).reduce((sum, amount) => {
    return sum + (parseFloat(amount) || 0);
  }, 0);
  const remainingAmount = totalAmount - assignedAmount;

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={containerVariants}
              className="flex flex-col"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Add New Expense
                </DialogTitle>
                <DialogDescription>
                  Add a new shared expense and split it among household members.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <motion.div variants={childVariants} className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description *
                  </Label>
                  <Input
                    id="description"
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
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Amount *
                    </Label>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="decimal"
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
                    <Label htmlFor="date" className="text-sm font-medium">
                      Date *
                    </Label>
                    <Input
                      id="date"
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
                  <Label htmlFor="category" className="text-sm font-medium">
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
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div variants={childVariants} className="space-y-2">
                  <Label htmlFor="split_type" className="text-sm font-medium">
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
                      <SelectItem value="custom">Custom Split</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Custom Split Section */}
                {formData.split_type === 'custom' && (
                  <motion.div variants={childVariants} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <Label className="text-sm font-medium">
                        Select Users and Amounts
                      </Label>
                    </div>

                    <Card>
                      <CardContent className="p-4 space-y-3">
                        {householdMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3"
                          >
                            <Checkbox
                              id={`user-${member.id}`}
                              checked={selectedUsers.has(member.id)}
                              onCheckedChange={(checked) =>
                                handleUserSelection(
                                  member.id,
                                  checked as boolean
                                )
                              }
                              disabled={
                                loading || member.id === currentUser?.id
                              }
                            />
                            <Label
                              htmlFor={`user-${member.id}`}
                              className="flex-1 text-sm"
                            >
                              {member.full_name}
                              {member.id === currentUser?.id && ' (You)'}
                            </Label>
                            {selectedUsers.has(member.id) && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-500">$</span>
                                <Input
                                  min="0"
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  value={customSplits[member.id] || ''}
                                  onChange={(e) =>
                                    handleCustomSplitChange(
                                      member.id,
                                      e.target.value
                                    )
                                  }
                                  disabled={loading}
                                  className="w-20 h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Split Summary */}
                    {totalAmount > 0 && selectedUsers.size > 0 && (
                      <Card>
                        <CardContent className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Total Expense:</span>
                              <span className="font-medium">
                                ${totalAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Assigned:</span>
                              <span className="font-medium">
                                ${assignedAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-1">
                              <span>Remaining:</span>
                              <span
                                className={`font-medium ${
                                  Math.abs(remainingAmount) < 0.01
                                    ? 'text-green-600'
                                    : remainingAmount > 0
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                                }`}
                              >
                                ${remainingAmount.toFixed(2)}
                              </span>
                            </div>
                            {Math.abs(remainingAmount) > 0.01 && (
                              <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                                <AlertCircle className="h-3 w-3" />
                                <span>
                                  Split amounts must equal the total expense
                                  amount
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )}

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
                      <Plus className="w-4 h-4 mr-2" />
                      {loading ? 'Adding...' : 'Add Expense'}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </form>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default AddExpenseDialog;
