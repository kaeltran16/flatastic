import { useState } from 'react';

interface UseDialogStateOptions {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function useDialogState(options: UseDialogStateOptions = {}) {
  const { open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen = false } = options;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  return {
    isOpen,
    setIsOpen,
    isControlled,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}
