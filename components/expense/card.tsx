import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { CheckCircle2, Clock, Users } from 'lucide-react';
import { useState } from 'react';
import ActionCard from '../action-card';
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
}: ExpenseCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getCategoryIcon = (category: string) => {
    const icons = {
      groceries: '🛒',
      utilities: '⚡',
      household: '🏠',
      food: '🍽️',
      transportation: '🚗',
      entertainment: '🎬',
      default: '💰',
    };
    return icons[category as keyof typeof icons] || icons.default;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${Math.abs(diffInDays)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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

  const getCardStyling = () => {
    if (isSettled)
      return 'border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50';
    if (isPayer && !isCurrentUserSettled)
      return 'border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50';
    if (!isPayer && !isCurrentUserSettled)
      return 'border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50';
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  return (
    <>
      <ActionCard
        onEdit={isPayer && canModify ? handleEdit : undefined}
        onDelete={isPayer && canModify ? handleDelete : undefined}
        canEdit={canModify}
        canDelete={canModify}
        editLabel="Edit Expense"
        deleteLabel="Delete Expense"
        className={`${getCardStyling()} shadow-sm overflow-hidden mb-3`}
        contentClassName="p-0"
        hoverAnimation={true}
      >
        {/* Main Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Category Icon */}
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-lg flex-shrink-0">
                {getCategoryIcon(expense.category || '')}
              </div>

              {/* Title & Meta */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight mb-1 truncate">
                  {expense.description}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-xs font-medium bg-gray-200 dark:bg-gray-700">
                        {expense.payer_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-20">
                      {isPayer ? 'You' : expense.payer_name}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span>{formatDate(expense.date)}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${expense.your_share.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                ${expense.amount.toFixed(2)} total
              </div>
            </div>
          </div>

          {/* Status & Progress */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isSettled ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Settled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {settledCount}/{expense.splits.length} paid
                  </span>
                </div>
              )}

              {expense.category && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-1 bg-white/60 dark:bg-gray-800/60"
                >
                  {expense.category}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{expense.splits.length}</span>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        {expense.status === 'pending' && !isCurrentUserSettled && (
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 p-3">
            <div className="flex gap-2">
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
                    size="sm"
                    className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 w-full"
                  >
                    Details
                  </Button>
                }
              />

              {isPayer ? (
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm w-full"
                  onClick={() => onSettle?.(expense)}
                >
                  Mark Paid
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
                    <Button size="sm" className="flex-1 w-full">
                      Pay ${expense.your_share.toFixed(2)}
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Just details button for settled expenses */}
        {(expense.status === 'settled' || isCurrentUserSettled) && (
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 p-3">
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
                  size="sm"
                  className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                >
                  View Details
                </Button>
              }
            />
          </div>
        )}
      </ActionCard>

      {/* Dialogs - Use controlled mode without trigger */}
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
