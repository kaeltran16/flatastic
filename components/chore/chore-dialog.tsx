'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import { CreateChoreInput, UpdateChoreInput } from '@/lib/validations/chore';
import { forwardRef, ReactNode, useImperativeHandle, useState } from 'react';
import ChoreForm from './chore-form';

interface ChoreDialogProps {
  mode: 'create' | 'edit';
  householdId?: string;
  currentUserId?: string;
  chore?: Chore;
  householdMembers: Profile[];
  onSubmit: (formData: ChoreFormData) => Promise<void>;
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
  // Children for custom button rendering
  children?: ReactNode;
}

export interface ChoreDialogRef {
  open: () => void;
  close: () => void;
}

const ChoreDialog = forwardRef<ChoreDialogRef, ChoreDialogProps>(
  (
    {
      mode,
      householdId,
      currentUserId,
      chore,
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
        'ChoreDialog: householdId and currentUserId are required for create mode'
      );
      return null;
    }

    if (mode === 'edit' && !chore) {
      console.error('ChoreDialog: chore is required for edit mode');
      return null;
    }

    const handleSubmit = async (formData: ChoreFormData) => {
      try {
        console.log('formData', formData);
        await onSubmit(formData);
        setIsOpen(false); // Close dialog on success
      } catch (error) {
        // Error handling is done in the mutation hook
        console.error(`Failed to ${mode} chore:`, error);
        // Keep dialog open on error so user can retry
      }
    };

    // Default button text based on mode
    const defaultButtonText = mode === 'create' ? 'Add Chore' : 'Edit';
    const displayButtonText = buttonText || defaultButtonText;

    // Dialog title based on mode
    const dialogTitle = mode === 'create' ? 'Add New Chore' : 'Edit Chore';

    // Prepare initial data for edit mode
    const initialData =
      mode === 'edit' && chore
        ? {
            name: chore.name,
            description: chore.description || '',
            assigned_to: chore.assigned_to || '',
            due_date: chore.due_date || '',
            recurring_type: chore.recurring_type || 'none',
            recurring_interval: chore.recurring_interval || undefined,
          }
        : undefined;

    // Single dialog content component to avoid duplication
    const dialogContent = (
      <DialogContent className="w-[90vw] max-w-md mx-auto my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className={hideTitle ? 'sr-only' : ''}>
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <ChoreForm
          mode={mode}
          initialData={
            initialData as Partial<CreateChoreInput | UpdateChoreInput>
          }
          householdId={mode === 'create' ? householdId! : chore!.household_id}
          householdMembers={householdMembers}
          currentUserId={currentUserId}
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

ChoreDialog.displayName = 'ChoreDialog';

export default ChoreDialog;
