// components/chore/chore-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import {
  CreateChoreSchema,
  UpdateChoreSchema,
  type CreateChoreInput,
  type UpdateChoreInput,
} from '@/lib/validations/chore';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ChoreFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<CreateChoreInput | UpdateChoreInput>;
  householdId: string;
  householdMembers: Profile[];
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function ChoreForm({
  mode,
  initialData,
  householdId,
  householdMembers,
  onSubmit,
  onCancel,
  isLoading = false,
}: ChoreFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData?.due_date ? new Date(initialData.due_date) : undefined
  );

  const schema = mode === 'create' ? CreateChoreSchema : UpdateChoreSchema;
  const defaultValues =
    mode === 'create'
      ? {
          name: '',
          description: '',
          assigned_to: undefined, // Changed from '' to undefined
          due_date: '',
          recurring_type: 'none' as const,
          recurring_interval: undefined,
          household_id: householdId,
          ...initialData,
        }
      : {
          name: '',
          description: '',
          assigned_to: undefined, // Changed from '' to undefined
          due_date: '',
          recurring_type: 'none' as const,
          recurring_interval: undefined,
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

  const recurringType = watch('recurring_type');
  const showRecurringInterval = recurringType && recurringType !== 'none';

  const handleFormSubmit = async (
    data: CreateChoreInput | UpdateChoreInput
  ) => {
    try {
      const formData = new FormData();

      // Add all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add household_id for create mode
      if (mode === 'create') {
        formData.append('household_id', householdId);
      }

      // Handle date formatting
      if (selectedDate) {
        formData.set('due_date', selectedDate.toISOString());
      }

      await onSubmit(formData);

      // Reset form on successful creation
      if (mode === 'create') {
        reset();
        setSelectedDate(undefined);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setValue('due_date', date ? date.toISOString() : '');
  };

  const handleAssigneeChange = (value: string) => {
    // Convert "unassigned" back to undefined for the form
    setValue('assigned_to', value === 'unassigned' ? undefined : value);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New Chore' : 'Edit Chore'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Chore Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Chore Name *
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Take out trash"
              className={cn(errors.name && 'border-red-500')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Additional details about the chore..."
              rows={3}
              className={cn(errors.description && 'border-red-500')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to" className="text-sm font-medium">
              Assign To
            </Label>
            <Select
              value={watch('assigned_to') || 'unassigned'}
              onValueChange={handleAssigneeChange}
            >
              <SelectTrigger
                className={cn(errors.assigned_to && 'border-red-500')}
              >
                <SelectValue placeholder="Select a household member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {householdMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assigned_to && (
              <p className="text-sm text-red-500">
                {errors.assigned_to.message}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground',
                    errors.due_date && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, 'PPP')
                    : 'Select due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.due_date && (
              <p className="text-sm text-red-500">{errors.due_date.message}</p>
            )}
          </div>

          {/* Recurring Type */}
          <div className="space-y-2">
            <Label htmlFor="recurring_type" className="text-sm font-medium">
              Recurring Type
            </Label>
            <Select
              value={watch('recurring_type') || 'none'}
              onValueChange={(value) =>
                setValue('recurring_type', value as any)
              }
            >
              <SelectTrigger
                className={cn(errors.recurring_type && 'border-red-500')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recurrence</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {errors.recurring_type && (
              <p className="text-sm text-red-500">
                {errors.recurring_type.message}
              </p>
            )}
          </div>

          {/* Recurring Interval */}
          {showRecurringInterval && (
            <div className="space-y-2">
              <Label
                htmlFor="recurring_interval"
                className="text-sm font-medium"
              >
                Recurring Interval *
              </Label>
              <Input
                id="recurring_interval"
                type="number"
                min="1"
                max="365"
                {...register('recurring_interval', { valueAsNumber: true })}
                placeholder={`Every X ${recurringType}(s)`}
                className={cn(errors.recurring_interval && 'border-red-500')}
              />
              <p className="text-xs text-muted-foreground">
                How often should this chore repeat? (e.g., every 2 weeks)
              </p>
              {errors.recurring_interval && (
                <p className="text-sm text-red-500">
                  {errors.recurring_interval.message}
                </p>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex-1"
            >
              {(isSubmitting || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === 'create' ? 'Create Chore' : 'Update Chore'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
