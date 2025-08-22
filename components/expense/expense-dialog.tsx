'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import {
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/lib/validations/expense';
import { DollarSign, Edit, Plus } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import ExpenseForm from './expense-form';

interface ExpenseDialogProps {
  mode: 'create' | 'edit';
  householdId?: string;
  currentUserId?: string;
  expense?: ExpenseWithDetails;
  householdMembers: Profile[];
  onSubmit: (formData: ExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  // Button customization (only used when not controlled externally)
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonText?: string;
  // External control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface ExpenseDialogRef {
  open: () => void;
  close: () => void;
}

const ExpenseDialog = forwardRef<ExpenseDialogRef, ExpenseDialogProps>(
  (
    {
      mode,
      householdId,
      currentUserId,
      expense,
      householdMembers,
      onSubmit,
      isLoading = false,
      buttonVariant = 'default',
      buttonSize = 'default',
      buttonText,
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Use controlled or internal state
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;
    const setIsOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }));

    // Validate required props based on mode
    if (mode === 'create' && (!householdId || !currentUserId)) {
      console.error(
        'ExpenseDialog: householdId and currentUserId are required for create mode'
      );
      return null;
    }

    if (mode === 'edit' && !expense) {
      console.error('ExpenseDialog: expense is required for edit mode');
      return null;
    }

    const handleSubmit = async (formData: ExpenseFormData) => {
      try {
        await onSubmit(formData);
        setIsOpen(false); // Close dialog on success
      } catch (error) {
        // Error handling is done in the mutation hook
        console.error(`Failed to ${mode} expense:`, error);
        // Keep dialog open on error so user can retry
      }
    };

    // Default button text based on mode
    const defaultButtonText = mode === 'create' ? 'Add Expense' : 'Edit';
    const displayButtonText = buttonText || defaultButtonText;

    // Dialog title based on mode
    const dialogTitle = mode === 'create' ? 'Add New Expense' : 'Edit Expense';

    // Default icon based on mode
    const Icon = mode === 'create' ? Plus : Edit;

    // Prepare initial data for edit mode
    const initialData =
      mode === 'edit' && expense
        ? {
            description: expense.description,
            amount: expense.amount,
            category: expense.category || '',
            date: expense.date,
            split_type: expense.split_type || 'equal',
            custom_splits:
              expense.split_type === 'custom' && expense.splits
                ? expense.splits.map((split) => ({
                    user_id: split.user_id,
                    amount: split.amount_owed,
                  }))
                : undefined,
            selected_users:
              expense.split_type === 'custom' && expense.splits
                ? expense.splits.map((split) => split.user_id)
                : undefined,
          }
        : undefined;

    // Check if expense can be edited
    const canEdit =
      mode === 'create' ||
      (expense &&
        expense.splits.some(
          (split) => split.user_id !== expense.paid_by && split.is_settled
        ) === false);

    const DialogComponent = (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === 'create' ? (
                <DollarSign className="h-5 w-5" />
              ) : (
                <Edit className="h-5 w-5" />
              )}
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            mode={mode}
            initialData={
              initialData as Partial<CreateExpenseInput | UpdateExpenseInput>
            }
            householdId={
              mode === 'create' ? householdId! : expense!.household_id
            }
            householdMembers={householdMembers}
            currentUserId={currentUserId}
            expense={mode === 'edit' ? expense : undefined}
            canEdit={canEdit}
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    );

    // If controlled externally, just return the dialog
    if (isControlled) {
      return DialogComponent;
    }

    // Otherwise, include trigger button
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant={buttonVariant}
            size={buttonSize}
            disabled={isLoading}
          >
            <Icon className="h-4 w-4 mr-2" />
            {displayButtonText}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 m-0">
          <DialogHeader>
            <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            mode={mode}
            initialData={
              initialData as Partial<CreateExpenseInput | UpdateExpenseInput>
            }
            householdId={
              mode === 'create' ? householdId! : expense!.household_id
            }
            householdMembers={householdMembers}
            currentUserId={currentUserId}
            expense={mode === 'edit' ? expense : undefined}
            canEdit={canEdit}
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    );
  }
);

ExpenseDialog.displayName = 'ExpenseDialog';

export default ExpenseDialog;
