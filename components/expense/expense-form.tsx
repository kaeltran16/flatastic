'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import {
    CreateExpenseSchema,
    UpdateExpenseSchema,
    type CreateExpenseInput,
    type CustomSplit,
    type UpdateExpenseInput,
} from '@/lib/validations/expense';
import { formatDate } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle,
    CalendarDays,
    DollarSign,
    Edit,
    Loader2,
    Plus,
    Save,
    Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ExpenseFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CreateExpenseInput | UpdateExpenseInput>;
  householdId: string;
  householdMembers: Profile[];
  currentUserId?: string;
  expense?: ExpenseWithDetails;
  canEdit?: boolean;
  onSubmit: (formData: ExpenseFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

type ExpenseCategoryOption = {
  value:
    | 'groceries'
    | 'utilities'
    | 'household'
    | 'food'
    | 'transportation'
    | 'entertainment'
    | 'other';
  label: string;
};

const categories: ExpenseCategoryOption[] = [
  { value: 'groceries', label: 'Groceries' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'household', label: 'Household' },
  { value: 'food', label: 'Food' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseForm({
  mode,
  initialData,
  householdId,
  householdMembers,
  currentUserId,
  expense,
  canEdit = true,
  onSubmit,
  onCancel,
  isLoading = false,
}: ExpenseFormProps) {
  const [customSplits, setCustomSplits] = useState<{
    [userId: string]: string;
  }>({});
  const [percentageSplits, setPercentageSplits] = useState<{
    [userId: string]: string;
  }>({});
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.date ? new Date(initialData.date) : new Date()
  );

  const schema = mode === 'create' ? CreateExpenseSchema : UpdateExpenseSchema;
  const defaultValues =
    mode === 'create'
      ? {
          description: '',
          amount: undefined,
          category: 'other' as const,
          date: new Date().toISOString().split('T')[0],
          split_type: 'equal' as const,
          custom_splits: undefined,
          selected_users: undefined,
          household_id: householdId,
          ...initialData,
        }
      : {
          description: '',
          amount: undefined,
          category: 'other' as const,
          date: new Date().toISOString().split('T')[0],
          split_type: 'equal' as const,
          custom_splits: undefined,
          selected_users: undefined,
          ...initialData,
        };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    setError,
    clearErrors,
  } = useForm<CreateExpenseInput | UpdateExpenseInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as CreateExpenseInput | UpdateExpenseInput,
  });

  const splitType = watch('split_type');
  const amount = watch('amount');
  const showCustomSplit = splitType === 'custom';
  const showPercentageSplit = splitType === 'percentage';

  // Initialize custom splits from initial data
  useEffect(() => {
    if (initialData?.custom_splits && initialData?.selected_users) {
      const splits: { [userId: string]: string } = {};
      const users = new Set<string>();

      initialData.custom_splits.forEach((split) => {
        splits[split.user_id] = split.amount.toString();
        users.add(split.user_id);
      });

      setCustomSplits(splits);
      setSelectedUsers(users);
    }
  }, [initialData]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date || new Date());
    setValue('date', date ? date.toISOString() : '');
  };

  // Reset splits when split type changes
  useEffect(() => {
    if (splitType === 'equal') {
      setCustomSplits({});
      setPercentageSplits({});
      setSelectedUsers(new Set());
      setValue('custom_splits', undefined);
      setValue('percentage_splits', undefined);
      setValue('selected_users', undefined);
    } else if (splitType === 'custom' && currentUserId) {
      // If switching to custom and no users selected, initialize with current user
      setPercentageSplits({});
      setValue('percentage_splits', undefined);
      if (selectedUsers.size === 0) {
        setSelectedUsers(new Set([currentUserId]));
        setCustomSplits({ [currentUserId]: '' });
      }
    } else if (splitType === 'percentage' && currentUserId) {
      // If switching to percentage and no users selected, initialize with current user
      setCustomSplits({});
      setValue('custom_splits', undefined);
      if (selectedUsers.size === 0) {
        setSelectedUsers(new Set([currentUserId]));
        setPercentageSplits({ [currentUserId]: '' });
      }
    }
  }, [splitType, currentUserId, setValue]);

  // Auto-calculate remaining amount for custom splits
  useEffect(() => {
    if (splitType === 'custom' && amount) {
      const totalAmount =
        typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(totalAmount)) return;

      const assignedAmount = Object.values(customSplits).reduce(
        (sum, splitAmount) => {
          return sum + (parseFloat(splitAmount) || 0);
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
  }, [customSplits, selectedUsers, amount, splitType]);

  // Update form values when custom splits change
  useEffect(() => {
    if (splitType === 'custom') {
      const splits: CustomSplit[] = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        amount: parseFloat(customSplits[userId]) || 0,
      }));

      setValue('custom_splits', splits);
      setValue('selected_users', Array.from(selectedUsers));

      // Validate custom splits
      if (amount && selectedUsers.size > 0) {
        const totalAmount =
          typeof amount === 'string' ? parseFloat(amount) : amount;
        const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);

        if (Math.abs(splitTotal - totalAmount) > 0.01) {
          setError('custom_splits', {
            type: 'manual',
            message: `Split amounts ($${splitTotal.toFixed(
              2
            )}) must equal the total expense amount ($${totalAmount.toFixed(
              2
            )})`,
          });
        } else {
          clearErrors('custom_splits');
        }
      }
    }
  }, [
    customSplits,
    selectedUsers,
    splitType,
    amount,
    setValue,
    setError,
    clearErrors,
  ]);

  // Update form values when percentage splits change
  useEffect(() => {
    if (splitType === 'percentage') {
      const splits = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        percentage: parseFloat(percentageSplits[userId]) || 0,
      }));

      setValue('percentage_splits', splits);
      setValue('selected_users', Array.from(selectedUsers));

      // Validate percentage splits
      if (selectedUsers.size > 0) {
        const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);

        if (Math.abs(totalPercentage - 100) > 0.01) {
          setError('percentage_splits', {
            type: 'manual',
            message: `Percentages (${totalPercentage.toFixed(1)}%) must add up to 100%`,
          });
        } else {
          clearErrors('percentage_splits');
        }
      }
    }
  }, [
    percentageSplits,
    selectedUsers,
    splitType,
    setValue,
    setError,
    clearErrors,
  ]);

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelectedUsers = new Set(selectedUsers);
    const newCustomSplits = { ...customSplits };
    const newPercentageSplits = { ...percentageSplits };

    if (checked) {
      newSelectedUsers.add(userId);
      if (!newCustomSplits[userId]) {
        newCustomSplits[userId] = '';
      }
      if (!newPercentageSplits[userId]) {
        newPercentageSplits[userId] = '';
      }
    } else {
      newSelectedUsers.delete(userId);
      delete newCustomSplits[userId];
      delete newPercentageSplits[userId];
    }

    setSelectedUsers(newSelectedUsers);
    setCustomSplits(newCustomSplits);
    setPercentageSplits(newPercentageSplits);
  };

  const handleCustomSplitChange = (userId: string, splitAmount: string) => {
    setCustomSplits((prev) => ({
      ...prev,
      [userId]: splitAmount,
    }));
  };

  const handlePercentageSplitChange = (userId: string, percentage: string) => {
    setPercentageSplits((prev) => ({
      ...prev,
      [userId]: percentage,
    }));
  };

  // Replace the existing handleFormSubmit function with this:
  const handleFormSubmit = async (
    data: CreateExpenseInput | UpdateExpenseInput
  ) => {
    try {
      // Convert to ExpenseFormData format directly (no FormData creation)
      const expenseFormData: ExpenseFormData = {
        description: data.description || '',
        amount: data.amount || 0,
        category: data.category || '',
        date: data.date || '',
        split_type: data.split_type || 'equal',
        custom_splits: data.custom_splits,
        percentage_splits: data.percentage_splits,
        selected_users: data.selected_users,
      };

      await onSubmit(expenseFormData);

      // Reset form on successful creation
      if (mode === 'create') {
        reset();
        setCustomSplits({});
        setPercentageSplits({});
        setSelectedUsers(new Set());
        setSelectedDate(new Date());
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const totalAmount =
    typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  const assignedAmount = Object.values(customSplits).reduce(
    (sum, splitAmount) => {
      return sum + (parseFloat(splitAmount) || 0);
    },
    0
  );
  const remainingAmount = totalAmount - assignedAmount;

  // Check if this is edit mode and expense cannot be edited
  if (mode === 'edit' && !canEdit) {
    return (
      <Card className="w-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Edit className="w-5 h-5" />
            Cannot Edit Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This expense cannot be edited because other members have already
              settled their payments. You can only edit expenses where no one
              else has paid you back yet.
            </p>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-none shadow-none mt-2">
      <CardContent>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4 sm:space-y-6"
        >
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="e.g., Weekly groceries, Internet bill"
              className={cn(
                'w-full h-11 sm:h-10 text-base sm:text-sm',
                errors.description && 'border-red-500'
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </motion.div>

          {/* Amount and Date */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount *
              </Label>
              <Input
                id="amount"
                {...register('amount', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                className={cn(
                  'w-full h-11 sm:h-10 text-base sm:text-sm',
                  errors.amount && 'border-red-500'
                )}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-2"
            >
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-11 justify-start text-left font-normal text-base sm:text-sm',
                      !selectedDate && 'text-muted-foreground',
                      errors.date && 'border-red-500'
                    )}
                    disabled={isSubmitting || isLoading}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {formatDate(selectedDate?.toISOString() || '')}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    className="scale-95 sm:scale-100"
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </motion.div>
          </motion.div>

          {/* Category */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label className="text-sm font-medium">Category *</Label>
            <Select
              value={watch('category') || 'other'}
              onValueChange={(value) => setValue('category', value as any)}
            >
              <SelectTrigger
                className={cn(
                  'w-full h-11 sm:h-10 text-base sm:text-sm',
                  errors.category && 'border-red-500'
                )}
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem
                    key={category.value}
                    value={category.value}
                    className="py-3 sm:py-2 text-base sm:text-sm"
                  >
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </motion.div>

          {/* Split Type */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Split Type
            </Label>
            <Select
              value={watch('split_type') || 'equal'}
              onValueChange={(value) => setValue('split_type', value as any)}
            >
              <SelectTrigger
                className={cn(
                  'w-full h-11 sm:h-10 text-base sm:text-sm',
                  errors.split_type && 'border-red-500'
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="equal"
                  className="py-3 sm:py-2 text-base sm:text-sm"
                >
                  Split Equally
                </SelectItem>
                <SelectItem
                  value="custom"
                  className="py-3 sm:py-2 text-base sm:text-sm"
                >
                  Custom Split
                </SelectItem>
                <SelectItem
                  value="percentage"
                  className="py-3 sm:py-2 text-base sm:text-sm"
                >
                  Split by Percentage
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.split_type && (
              <p className="text-sm text-red-500">
                {errors.split_type.message}
              </p>
            )}
          </motion.div>

          {/* Custom Split Section */}
          <AnimatePresence>
            {showCustomSplit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    Select Users and Amounts
                  </Label>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    {householdMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`user-${member.id}`}
                          checked={selectedUsers.has(member.id)}
                          onCheckedChange={(checked) =>
                            handleUserSelection(member.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`user-${member.id}`}
                          className="flex-1 text-sm"
                        >
                          {member.full_name}
                          {member.id === currentUserId && ' (You)'}
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
                              Split amounts must equal the total expense amount
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {errors.custom_splits && (
                  <p className="text-sm text-red-500">
                    {errors.custom_splits.message}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Percentage Split Section */}
          <AnimatePresence>
            {showPercentageSplit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <Label className="text-sm font-medium">
                    Select Users and Percentages
                  </Label>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    {householdMembers.map((member) => {
                      const percentage = parseFloat(percentageSplits[member.id]) || 0;
                      const calculatedAmount = totalAmount > 0 ? (percentage / 100) * totalAmount : 0;
                      return (
                        <div key={member.id} className="flex items-center gap-3">
                          <Checkbox
                            id={`user-pct-${member.id}`}
                            checked={selectedUsers.has(member.id)}
                            onCheckedChange={(checked) =>
                              handleUserSelection(member.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`user-pct-${member.id}`}
                            className="flex-1 text-sm"
                          >
                            {member.full_name}
                            {member.id === currentUserId && ' (You)'}
                          </Label>
                          {selectedUsers.has(member.id) && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  min="0"
                                  max="100"
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={percentageSplits[member.id] || ''}
                                  onChange={(e) =>
                                    handlePercentageSplitChange(
                                      member.id,
                                      e.target.value
                                    )
                                  }
                                  className="w-16 h-8 text-sm"
                                />
                                <span className="text-sm text-gray-500">%</span>
                              </div>
                              {totalAmount > 0 && percentage > 0 && (
                                <span className="text-xs text-gray-400">
                                  (${calculatedAmount.toFixed(2)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Percentage Summary */}
                {selectedUsers.size > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="space-y-1 text-sm">
                        {totalAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Total Expense:</span>
                            <span className="font-medium">
                              ${totalAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Total Percentage:</span>
                          <span
                            className={`font-medium ${
                              Math.abs(
                                Object.values(percentageSplits).reduce(
                                  (sum, p) => sum + (parseFloat(p) || 0),
                                  0
                                ) - 100
                              ) < 0.01
                                ? 'text-green-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {Object.values(percentageSplits)
                              .reduce((sum, p) => sum + (parseFloat(p) || 0), 0)
                              .toFixed(1)}
                            %
                          </span>
                        </div>
                        {Math.abs(
                          Object.values(percentageSplits).reduce(
                            (sum, p) => sum + (parseFloat(p) || 0),
                            0
                          ) - 100
                        ) > 0.01 && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 mt-2">
                            <AlertCircle className="h-3 w-3" />
                            <span>
                              Percentages must add up to 100%
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {errors.percentage_splits && (
                  <p className="text-sm text-red-500">
                    {errors.percentage_splits.message}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-6 sm:pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isLoading}
                className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm"
              >
                Cancel
              </Button>
            )}
            <motion.div
              whileHover={{ scale: isSubmitting || isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting || isLoading ? 1 : 0.98 }}
              className="w-full sm:w-auto"
            >
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full sm:w-auto h-11 sm:h-10 bg-gray-900 hover:bg-gray-800 text-white text-base sm:text-sm"
              >
                {(isSubmitting || isLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!isSubmitting && !isLoading && (
                  <>
                    {mode === 'create' ? (
                      <Plus className="w-4 h-4 mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                  </>
                )}
                {mode === 'create' ? 'Add Expense' : 'Save Changes'}
              </Button>
            </motion.div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
