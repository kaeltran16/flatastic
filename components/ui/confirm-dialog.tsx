'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading?: boolean;
  loadingText?: string;
  canConfirm?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmVariant = 'default',
  isLoading: externalLoading,
  loadingText,
  canConfirm = true,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    const result = onConfirm();
    if (result instanceof Promise) {
      setInternalLoading(true);
      try {
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {canConfirm ? cancelText : 'Close'}
          </AlertDialogCancel>
          {canConfirm && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                confirmVariant === 'destructive'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : ''
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {loadingText || confirmText}
                </>
              ) : (
                confirmText
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
