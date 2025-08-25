import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  MoreVertical,
  Trash2,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import UserAvatar from '../user-avatar';
import DeleteExpenseDialog from './delete-expense-dialog';
import EditExpenseDialog, { ExpenseFormData } from './edit-expense-dialog';
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'groceries':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'utilities':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'household':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'food':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'transportation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'entertainment':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  };

  const isPayer = expense.paid_by === currentUser.id;
  const currentUserSplit = expense.splits.find(
    (split) => split.user_id === currentUser.id
  );
  const isCurrentUserSettled = currentUserSplit?.is_settled || false;

  // Check if expense can be edited/deleted (only payer can, and only if others haven't settled)
  const canModify =
    isPayer &&
    expense.splits.some(
      (split) => split.user_id !== currentUser.id && split.is_settled
    ) === false;

  // Animation variants matching the add dialog
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: { duration: 0.2, ease: 'easeIn' as const },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { ease: 'easeOut' as const } },
  };

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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={containerVariants}
                className="flex flex-col"
              >
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Expense Details
                    </DialogTitle>

                    {/* Actions Menu - only show for payer */}
                    {isPayer && (onEditExpense || onDeleteExpense) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {onEditExpense && (
                            <DropdownMenuItem
                              onClick={handleEdit}
                              disabled={!canModify}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Expense
                            </DropdownMenuItem>
                          )}
                          {onDeleteExpense && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={!canModify}
                                className="flex items-center gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Expense
                              </DropdownMenuItem>
                            </>
                          )}
                          {!canModify && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                Cannot modify: others have settled
                              </div>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <DialogDescription>
                    View the details of this expense and manage payments.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Main Info Card */}
                  <motion.div
                    variants={childVariants}
                    className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 sm:p-6 space-y-4"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold leading-tight mb-2 break-words">
                        {expense.description}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {expense.category && (
                          <Badge
                            className={`${getCategoryColor(
                              expense.category
                            )} text-xs font-medium px-2 py-1`}
                            variant="secondary"
                          >
                            {expense.category}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            expense.status === 'settled'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs font-medium px-2 py-1 flex items-center gap-1"
                        >
                          {expense.status === 'settled' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {expense.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Amount Display */}
                    <div className="text-center py-4 sm:py-6">
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        ${expense.your_share.toFixed(2)}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Total amount:{' '}
                          <span className="font-semibold text-foreground text-base">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Info Grid */}
                  <motion.div
                    variants={childVariants}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border/50">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          Date
                        </p>
                        <p className="font-semibold text-sm truncate">
                          {formatDate(expense.date)}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {formatFullDate(expense.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border/50">
                      <Users className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          Split Between
                        </p>
                        <p className="font-semibold text-sm">
                          {expense.splits.length} people
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <Separator />

                  {/* Paid By Section */}
                  <motion.div variants={childVariants} className="space-y-3">
                    <h3 className="text-base sm:text-lg font-semibold">
                      Paid By
                    </h3>
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <UserAvatar
                        className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0"
                        user={currentUser}
                        shouldShowName={true}
                        showAsYou={true}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {formatFullDate(expense.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          ${expense.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Action Buttons */}
                {expense.status === 'pending' && !isCurrentUserSettled && (
                  <DialogFooter className="flex gap-2 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="w-full sm:w-auto"
                    >
                      {isPayer ? (
                        <Button
                          onClick={() => {
                            onSettle?.(expense);
                            setIsOpen(false);
                          }}
                          className="w-full"
                        >
                          Mark as Settled
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setIsPaymentDialogOpen(true);
                            setIsOpen(false);
                          }}
                          className="w-full"
                        >
                          Pay ${expense.your_share.toFixed(2)}
                        </Button>
                      )}
                    </motion.div>
                  </DialogFooter>
                )}

                {/* If expense is settled or user has settled, just show close button */}
                {(expense.status === 'settled' || isCurrentUserSettled) && (
                  <DialogFooter className="pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                  </DialogFooter>
                )}
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
        <EditExpenseDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          expense={expense}
          householdMembers={householdMembers}
          currentUser={currentUser}
          onEditExpense={onEditExpense}
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
