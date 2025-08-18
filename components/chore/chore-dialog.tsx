'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Chore } from '@/lib/validations/chore';
import { Edit, Plus } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import ChoreForm from './chore-form';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ChoreDialogProps {
  mode: 'create' | 'edit';
  // For create mode
  householdId?: string;
  currentUserId?: string;
  // For edit mode
  chore?: Chore;
  // Common props
  householdMembers: Profile[];
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
  // Button customization (only used when not controlled externally)
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonText?: string;
  // External control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // New prop for hiding title visually
  hideTitle?: boolean;
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

    const handleSubmit = async (formData: FormData) => {
      try {
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
    const dialogTitle = mode === 'create' ? 'Create New Chore' : 'Edit Chore';

    // Default icon based on mode
    const Icon = mode === 'create' ? Plus : Edit;

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

    const DialogComponent = (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <ChoreForm
            mode={mode}
            initialData={initialData}
            householdId={mode === 'create' ? householdId! : chore!.household_id}
            householdMembers={householdMembers}
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
        <DialogContent className="p-0 m-0">
          <DialogHeader>
            <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <ChoreForm
            mode={mode}
            initialData={initialData}
            householdId={mode === 'create' ? householdId! : chore!.household_id}
            householdMembers={householdMembers}
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    );
  }
);

ChoreDialog.displayName = 'ChoreDialog';

export default ChoreDialog;
