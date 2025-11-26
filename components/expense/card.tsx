import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { formatDateRelatively } from '@/utils';
import { MoreVertical, Pencil, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import UserAvatar from '../user-avatar';
import DeleteExpenseDialog from './delete-expense-dialog';
import ExpenseDetailsDialog from './details-dialog';
import ExpenseDialog from './expense-dialog';

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
  onViewDetails?: (expense: ExpenseWithDetails) => void;
  onSettle?: (expense: ExpenseWithDetails) => void;
  onEditExpense?: (
    expenseId: string,
    expenseData: ExpenseFormData
  ) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  onExpenseUpdated?: () => void;
  currentUser: Profile;
  householdMembers: Profile[];
  index?: number;
}

export default function ExpenseCard({
  expense,
  onViewDetails,
  onSettle,
  onEditExpense,
  onDeleteExpense,
  onExpenseUpdated,
  currentUser,
  householdMembers,
  index = 0,
}: ExpenseCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isPayer = expense.paid_by === currentUser.id;
  const currentUserSplit = expense.splits.find(
    (split) => split.user_id === currentUser.id
  );
  const isCurrentUserSettled = currentUserSplit?.is_settled || false;

  const canModify =
    isPayer &&
    expense.splits.some(
      (split) => split.user_id !== currentUser.id && split.is_settled
    ) === false;

  const settledCount = expense.splits.filter(
    (split) => split.is_settled
  ).length;
  const isSettled = expense.status === 'settled';

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  // Glassmorphism colors based on status
  const getGlassStyle = () => {
    if (isSettled) {
      return 'bg-green-500/10 border-green-500/20 dark:bg-green-400/10 dark:border-green-400/20';
    }
    if (isPayer && !isCurrentUserSettled) {
      return 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-400/10 dark:border-blue-400/20';
    }
    if (!isPayer && !isCurrentUserSettled) {
      return 'bg-orange-500/10 border-orange-500/20 dark:bg-orange-400/10 dark:border-orange-400/20';
    }
    return 'bg-gray-500/10 border-gray-500/20 dark:bg-gray-400/10 dark:border-gray-400/20';
  };

  const getAccentGlow = () => {
    if (isSettled) return 'shadow-green-500/20';
    if (isPayer) return 'shadow-blue-500/20';
    return 'shadow-orange-500/20';
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          delay: index * 0.05,
          duration: 0.4,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div
          className={`
          group relative overflow-hidden rounded-2xl p-[1px]
          ${getGlassStyle()}
          backdrop-blur-xl
          border
          shadow-lg ${getAccentGlow()}
          hover:shadow-xl hover:${getAccentGlow()}
          transition-all duration-300
          ${isSettled ? 'opacity-75' : ''}
        `}
        >
          {/* Glassmorphism inner content */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-4 sm:p-5">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl" />

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold leading-tight mb-2 text-foreground">
                    {expense.description}
                  </h3>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      className={`backdrop-blur-sm text-xs px-2 py-0.5 ${
                        isSettled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    >
                      {isSettled
                        ? 'Settled'
                        : `${settledCount}/${expense.splits.length} paid`}
                    </Badge>
                    {expense.category && (
                      <Badge
                        variant="secondary"
                        className="backdrop-blur-sm text-xs px-2 py-0.5"
                      >
                        {expense.category}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                      <Users className="w-3 h-3" />
                      <span>{expense.splits.length}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                {isPayer && canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90">
                      <DropdownMenuItem onClick={handleEdit} className="gap-2 text-sm py-2">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="gap-2 text-sm py-2 text-red-600 dark:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Payer and Date */}
              <div className="flex items-center justify-between mb-3 text-sm">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                  <UserAvatar
                    user={expense.payer}
                    shouldShowName={true}
                    showAsYou={expense.paid_by === currentUser.id}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {formatDateRelatively(expense.date)}
                </span>
              </div>

              {/* Amount Display */}
              <div className="mb-3 bg-gradient-to-br from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                <div className="text-3xl font-bold text-foreground mb-1">
                  ${expense.your_share.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  of ${expense.amount.toFixed(2)} total
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {expense.status === 'pending' && !isCurrentUserSettled ? (
                  <>
                    {isPayer ? (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          className="w-full rounded-xl font-semibold text-sm shadow-lg backdrop-blur-sm h-10"
                          onClick={() => onSettle?.(expense)}
                          size="default"
                        >
                          Mark as Paid
                        </Button>
                      </motion.div>
                    ) : (
                      <ExpenseDetailsDialog
                        expense={expense}
                        currentUser={currentUser}
                        householdMembers={householdMembers}
                        onSettle={onSettle}
                        onEditExpense={onEditExpense}
                        onDeleteExpense={onDeleteExpense}
                        onExpenseUpdated={onExpenseUpdated}
                        trigger={
                          <Button className="w-full rounded-xl font-semibold text-sm shadow-lg backdrop-blur-sm h-10" size="default">
                            Pay ${expense.your_share.toFixed(2)}
                          </Button>
                        }
                      />
                    )}

                    <ExpenseDetailsDialog
                      expense={expense}
                      currentUser={currentUser}
                      householdMembers={householdMembers}
                      onSettle={onSettle}
                      onEditExpense={onEditExpense}
                      onDeleteExpense={onDeleteExpense}
                      onExpenseUpdated={onExpenseUpdated}
                      trigger={
                        <Button
                          variant="outline"
                          className="w-full rounded-xl font-medium text-sm backdrop-blur-sm h-10"
                          size="default"
                        >
                          View Details
                        </Button>
                      }
                    />
                  </>
                ) : (
                  <ExpenseDetailsDialog
                    expense={expense}
                    currentUser={currentUser}
                    householdMembers={householdMembers}
                    onSettle={onSettle}
                    onEditExpense={onEditExpense}
                    onDeleteExpense={onDeleteExpense}
                    onExpenseUpdated={onExpenseUpdated}
                    trigger={
                      <Button
                        variant="outline"
                        className="w-full rounded-xl font-medium text-sm backdrop-blur-sm h-10"
                        size="default"
                      >
                        View Details
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dialogs */}
      {isEditDialogOpen && (
        <ExpenseDialog
          mode="edit"
          householdId={expense.household_id}
          currentUserId={expense.paid_by}
          householdMembers={householdMembers}
          onSubmit={async (formData) => {
            await onEditExpense?.(expense.id, formData);
          }}
          expense={expense}
          isLoading={false}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      <DeleteExpenseDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        expense={expense}
        onExpenseDeleted={() => onExpenseUpdated?.()}
        onDeleteExpense={onDeleteExpense!}
      />
    </>
  );
}
