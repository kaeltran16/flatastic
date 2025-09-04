'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Profile } from '@/lib/supabase/schema.alias';
import { cn } from '@/lib/utils';
import {
  CreateChoreSchema,
  UpdateChoreSchema,
  type CreateChoreInput,
  type UpdateChoreInput,
} from '@/lib/validations/chore';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarDays,
  Edit,
  ListPlus,
  Loader2,
  Plus,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import UserAvatar from '../user-avatar';

import { ChoreFormData } from '@/hooks/use-chore';
import { formatDate } from '@/utils';

interface ChoreFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CreateChoreInput | UpdateChoreInput>;
  householdId: string;
  householdMembers: Profile[];
  currentUserId?: string;
  onSubmit: (formData: ChoreFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

type RecurringTypeOption = {
  value: 'none' | 'daily' | 'weekly' | 'monthly';
  label: string;
};

const recurringTypes: RecurringTypeOption[] = [
  { value: 'none', label: 'No Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ChoreForm({
  mode,
  initialData,
  householdId,
  householdMembers,
  currentUserId,
  onSubmit,
  onCancel,
  isLoading = false,
}: ChoreFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.due_date ? new Date(initialData.due_date) : new Date()
  );

  const schema = mode === 'create' ? CreateChoreSchema : UpdateChoreSchema;
  const defaultValues =
    mode === 'create'
      ? {
          name: '',
          description: '',
          assigned_to: undefined,
          due_date: selectedDate?.toISOString(),
          recurring_type: 'none' as const,
          recurring_interval: 1,
          household_id: householdId,
          ...initialData,
        }
      : {
          name: '',
          description: '',
          assigned_to: undefined,
          due_date: selectedDate?.toISOString(),
          recurring_type: 'none' as const,
          recurring_interval: 1,
          ...initialData,
        };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateChoreInput | UpdateChoreInput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleFormSubmit = async (
    data: CreateChoreInput | UpdateChoreInput
  ) => {
    try {
      // Convert to ExpenseFormData format directly (no FormData creation)
      const choreFormData: ChoreFormData = {
        name: data.name || '',
        description: data.description || '',
        assigned_to: data.assigned_to || '',
        due_date: data.due_date || '',
        recurring_type: data.recurring_type || 'none',
        recurring_interval: data.recurring_interval || 1,
        status: 'pending' as const,
        household_id: householdId,
      };

      await onSubmit(choreFormData);

      // Reset form on successful creation
      if (mode === 'create') {
        reset();
        setSelectedDate(new Date());
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date || new Date());
    setValue('due_date', date ? date.toISOString() : '');
  };

  const handleAssigneeChange = (value: string) => {
    // Convert "unassigned" back to undefined for the form
    setValue('assigned_to', value === 'unassigned' ? undefined : value);
  };

  const handleRecurringIntervalChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = parseInt(e.target.value) || 1;
    setValue('recurring_interval', Math.max(1, Math.min(365, value)));
  };

  const Icon = mode === 'create' ? ListPlus : Edit;

  return (
    <Card className="w-full border-none shadow-none mt-2">
      <CardContent>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <form
              onSubmit={handleSubmit(handleFormSubmit)}
              className="space-y-4 sm:space-y-6"
            >
              {/* Chore Name */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <Label htmlFor="name" className="text-sm font-medium">
                  Chore Name *
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Kitchen Deep Clean"
                  className={cn(
                    'w-full h-11 text-base sm:text-sm',
                    errors.name && 'border-red-500'
                  )}
                  disabled={isSubmitting || isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2"
              >
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Clean counters, stovetop, sink, and mop floor"
                  rows={3}
                  className={cn(
                    'resize-none text-base sm:text-sm min-h-[80px]',
                    errors.description && 'border-red-500'
                  )}
                  disabled={isSubmitting || isLoading}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </motion.div>

              {/* Assigned To */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assign to
                </Label>
                <Select
                  value={watch('assigned_to') || 'unassigned'}
                  onValueChange={handleAssigneeChange}
                  disabled={isSubmitting || isLoading}
                >
                  <SelectTrigger
                    className={cn(
                      'w-full h-11 text-base sm:text-sm',
                      errors.assigned_to && 'border-red-500'
                    )}
                  >
                    <SelectValue placeholder="Select member (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="unassigned" className="py-3 sm:py-2">
                      <div className="flex items-center gap-2 sm:gap-2">
                        <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          ?
                        </div>
                        <span className="text-base sm:text-sm">Unassigned</span>
                      </div>
                    </SelectItem>
                    {householdMembers.map((member) => (
                      <SelectItem
                        key={member.id}
                        value={member.id}
                        className="py-3 sm:py-2"
                      >
                        <UserAvatar
                          className="h-7 w-7"
                          user={member}
                          showAsYou={member.id === currentUserId}
                          shouldShowName={true}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assigned_to && (
                  <p className="text-sm text-red-500">
                    {errors.assigned_to.message}
                  </p>
                )}
              </motion.div>

              {/* Due Date */}
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
                        errors.due_date && 'border-red-500'
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
                {errors.due_date && (
                  <p className="text-sm text-red-500">
                    {errors.due_date.message}
                  </p>
                )}
              </motion.div>

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
                    {isSubmitting || isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {mode === 'create' ? 'Add Chore' : 'Update Chore'}
                  </Button>
                </motion.div>
              </div>
            </form>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
