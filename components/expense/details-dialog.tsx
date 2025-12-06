import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { formatDateRelatively } from '@/utils';
import {
    CheckCircle2,
    Clock,
    Edit,
    MoreVertical,
    Receipt,
    Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import UserAvatar from '../user-avatar';
import DeleteExpenseDialog from './delete-expense-dialog';
import ExpenseDialog from './expense-dialog';
import PaymentDialog from './payment-dialog';

interface ExpenseDetailsDialogProps {
  expense: ExpenseWithDetails;
  currentUser: Profile;
  householdMembers: Profile[];
  trigger: React.ReactNode;
  onSettle?: (expense: ExpenseWithDetails) => void;
  onEditExpense?: (
    expenseId: string,
    expenseData: ExpenseFormData
  ) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  onExpenseUpdated?: () => void;
}

export default function ExpenseDetailsDialog({
  expense,
  currentUser,
  householdMembers,
  trigger,
  onSettle,
  onEditExpense,
  onDeleteExpense,
  onExpenseUpdated,
}: ExpenseDetailsDialogProps) {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isPayer = expense.paid_by === currentUser.id;
  const currentUserSplit = expense.splits.find(
    (split) => split.user_id === currentUser.id
  );
  const isCurrentUserSettled = currentUserSplit?.is_settled || false;
  const settledCount = expense.splits.filter((s) => s.is_settled).length;
  const isFullySettled = expense.status === 'settled';

  const canModify =
    isPayer &&
    expense.splits.some(
      (split) => split.user_id !== currentUser.id && split.is_settled
    ) === false;

  const handleEdit = () => {
    setIsOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const handleExpenseUpdated = () => {
    onExpenseUpdated?.();
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {trigger && (
          <div className="w-full" onClick={() => setIsOpen(true)}>
            {trigger}
          </div>
        )}

        <AnimatePresence>
          {isOpen && (
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 pb-6">
                  <DialogHeader className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary/10">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle className="text-lg font-semibold">
                          Expense Details
                        </DialogTitle>
                      </div>

                      {/* Actions Menu */}
                      {isPayer && (onEditExpense || onDeleteExpense) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEditExpense && (
                              <DropdownMenuItem onClick={handleEdit} disabled={!canModify}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDeleteExpense && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={handleDelete}
                                  disabled={!canModify}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Description & badges */}
                    <div>
                      <h2 className="text-xl font-bold leading-tight mb-2">
                        {expense.description}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            isFullySettled
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}
                        >
                          {isFullySettled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Settled
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              {settledCount}/{expense.splits.length} paid
                            </>
                          )}
                        </Badge>
                        {expense.category && (
                          <Badge variant="outline" className="text-xs">
                            {expense.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateRelatively(expense.date)}
                        </span>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                  {/* Amount card */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your share</p>
                      <p className="text-3xl font-bold tabular-nums">
                        ${expense.your_share.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        ${expense.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Paid by */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Paid by</p>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
                      <UserAvatar
                        user={expense.payer}
                        className="h-10 w-10"
                        shouldShowName={false}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {expense.paid_by === currentUser.id
                            ? 'You'
                            : expense.payer.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(expense.date)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        ${expense.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Split breakdown */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Split between {expense.splits.length} people
                    </p>
                    <div className="space-y-2">
                      {expense.splits.map((split) => {
                        const member = householdMembers.find(
                          (m) => m.id === split.user_id
                        );
                        const isYou = split.user_id === currentUser.id;

                        return (
                          <div
                            key={split.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                              split.is_settled
                                ? 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-500/10 dark:border-emerald-500/20'
                                : 'bg-muted/30 border-border/50'
                            }`}
                          >
                            <UserAvatar
                              user={member || { id: split.user_id, full_name: 'Unknown' } as Profile}
                              className="h-8 w-8"
                              shouldShowName={false}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {isYou ? 'You' : member?.full_name || 'Unknown'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold tabular-nums">
                                ${split.amount_owed.toFixed(2)}
                              </span>
                              {split.is_settled ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-5 pt-0">
                  {expense.status === 'pending' && !isCurrentUserSettled ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                      {isPayer ? (
                        <Button
                          onClick={() => {
                            onSettle?.(expense);
                            setIsOpen(false);
                          }}
                          className="flex-1"
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setIsPaymentDialogOpen(true);
                            setIsOpen(false);
                          }}
                          className="flex-1"
                        >
                          Pay ${expense.your_share.toFixed(2)}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="w-full"
                    >
                      Close
                    </Button>
                  )}
                </DialogFooter>
              </motion.div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        expense={expense}
        currentUser={currentUser}
        onSettle={onSettle}
      />

      {/* Edit Dialog */}
      {onEditExpense && (
        <ExpenseDialog
          mode="edit"
          householdId={expense.household_id}
          currentUserId={expense.paid_by}
          expense={expense}
          householdMembers={householdMembers}
          onSubmit={async (formData) => {
            await onEditExpense?.(expense.id, formData);
          }}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Delete Dialog */}
      {onDeleteExpense && (
        <DeleteExpenseDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          expense={expense}
          onExpenseDeleted={handleExpenseUpdated}
          onDeleteExpense={onDeleteExpense}
        />
      )}
    </>
  );
}
