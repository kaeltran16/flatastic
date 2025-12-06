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
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.03,
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1],
        }}
      >
        <div
          className={`
            group relative overflow-hidden rounded-xl
            bg-card border shadow-sm
            hover:shadow-md hover:border-primary/20
            transition-all duration-200
            ${isSettled ? 'opacity-70' : ''}
          `}
        >
          {/* Left accent bar */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              isSettled
                ? 'bg-emerald-500'
                : isPayer
                ? 'bg-blue-500'
                : 'bg-amber-500'
            }`}
          />

          <div className="p-4 pl-5">
            {/* Top row: Description + Menu */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight line-clamp-1 mb-1.5">
                  {expense.description}
                </h3>
                
                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${
                      isSettled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}
                  >
                    {isSettled ? 'Settled' : `${settledCount}/${expense.splits.length} paid`}
                  </Badge>
                  {expense.category && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {expense.category}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateRelatively(expense.date)}
                  </span>
                </div>
              </div>

              {/* Actions Menu */}
              {isPayer && canModify && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit} className="gap-2">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="gap-2 text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Middle row: Payer + Amount */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserAvatar
                  user={expense.payer}
                  className="h-7 w-7"
                  shouldShowName={false}
                />
                <div className="text-xs">
                  <span className="text-muted-foreground">Paid by </span>
                  <span className="font-medium">
                    {expense.paid_by === currentUser.id ? 'You' : expense.payer.full_name?.split(' ')[0]}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">
                  ${expense.your_share.toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  of ${expense.amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Action button */}
            {expense.status === 'pending' && !isCurrentUserSettled ? (
              isPayer ? (
                <Button
                  className="w-full h-9 text-sm font-medium"
                  onClick={() => onSettle?.(expense)}
                >
                  Mark as Paid
                </Button>
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
                    <Button className="w-full h-9 text-sm font-medium">
                      Pay ${expense.your_share.toFixed(2)}
                    </Button>
                  }
                />
              )
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
                  <Button variant="outline" className="w-full h-9 text-sm font-medium">
                    View Details
                  </Button>
                }
              />
            )}
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
