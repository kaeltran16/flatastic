'use client';
import ChoreDialog from '@/components/chore/chore-dialog';
import ExpenseDialog from '@/components/expense/expense-dialog';
import SettlementDialog from '@/components/payment/settlement-dialog';
import { Button } from '@/components/ui/button';
import { useCreateChore } from '@/hooks/use-chore';
import { useExpenses } from '@/hooks/use-expense';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import { Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FABMenu } from './fab-menu';

const NO_FAB_PATHS = ['/auth/login', '/auth/signup', '/auth/callback', '/auth/error'];

export function FAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [choreDialogOpen, setChoreDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const pathname = usePathname();
  const { profile } = useProfile();
  const { members = [] } = useHouseholdMembers(profile?.household_id);
  const { addExpense, isAddingExpense } = useExpenses();
  const { mutateAsync: createChore, isPending: isCreatingChore } = useCreateChore();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleAction = (action: 'expense' | 'chore' | 'payment') => {
    switch (action) {
      case 'expense':
        setExpenseDialogOpen(true);
        break;
      case 'chore':
        setChoreDialogOpen(true);
        break;
      case 'payment':
        setPaymentDialogOpen(true);
        break;
    }
  };

  // Don't show FAB on auth pages or if user has no household
  if (NO_FAB_PATHS.includes(pathname) || !profile?.household_id) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Menu */}
      <AnimatePresence>
        {isOpen && (
          <FABMenu
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.div
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          boxShadow: isOpen
            ? '0 0 0 0 rgba(0, 0, 0, 0)'
            : [
                '0 0 0 0 rgba(var(--primary), 0.4)',
                '0 0 0 10px rgba(var(--primary), 0)',
              ],
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          boxShadow: {
            duration: 2,
            repeat: Infinity,
            repeatType: 'loop',
          },
        }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          aria-label={isOpen ? 'Close menu' : 'Open quick add menu'}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </motion.div>
        </Button>
      </motion.div>

      {/* Dialogs - Rendered here to persist state */}
      <ExpenseDialog
        mode="create"
        householdId={profile.household_id}
        currentUserId={profile.id}
        householdMembers={members}
        onSubmit={addExpense}
        isLoading={isAddingExpense}
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
      />

      {profile && (
        <ChoreDialog
          mode="create"
          householdId={profile.household_id}
          currentUser={profile}
          householdMembers={members}
          onSubmit={async (data) => {
            await createChore(data);
          }}
          isLoading={isCreatingChore}
          open={choreDialogOpen}
          onOpenChange={setChoreDialogOpen}
        />
      )}

      <SettlementDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        selectedBalance={null}
        currentUserId={profile.id}
        onSettle={async () => {
          // This will be handled by the dialog itself
        }}
      />
    </>
  );
}
