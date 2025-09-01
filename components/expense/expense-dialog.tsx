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
import { forwardRef, ReactNode, useImperativeHandle, useState } from 'react';
import ExpenseForm from './expense-form';

interface ExpenseDialogProps {
  mode: 'create' | 'edit';
  householdId?: string;
  currentUserId?: string;
  expense?: ExpenseWithDetails;
  householdMembers: Profile[];
  onSubmit: (formData: ExpenseFormData) => Promise<void>;
  isLoading?: boolean;
  // Button customization (only used when children is null and not controlled externally)
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonText?: string;
  // External control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // New prop for hiding title visually
  hideTitle?: boolean;
  className?: string;
  children?: ReactNode;
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
      hideTitle = false,
      className,
      children,
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

    // Single dialog content component to avoid duplication
    const dialogContent = (
      <DialogContent className="w-[90vw] max-w-md mx-auto my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className={hideTitle ? 'sr-only' : ''}>
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <ExpenseForm
          mode={mode}
          initialData={
            initialData as Partial<CreateExpenseInput | UpdateExpenseInput>
          }
          householdId={mode === 'create' ? householdId! : expense!.household_id}
          householdMembers={householdMembers}
          currentUserId={currentUserId}
          expense={mode === 'edit' ? expense : undefined}
          canEdit={canEdit}
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    );


    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* Only render trigger if not controlled externally */}
        {!isControlled && (
          <DialogTrigger asChild>
            {children ? (
              children
            ) : (
              <Button
                className={className}
                variant={buttonVariant}
                size={buttonSize}
                disabled={isLoading}
              >
                {displayButtonText}
              </Button>
            )}
          </DialogTrigger>
        )}
        {dialogContent}
      </Dialog>
    );
  }
);

ExpenseDialog.displayName = 'ExpenseDialog';

export default ExpenseDialog;
