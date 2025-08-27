import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExpenseFormData } from '@/hooks/use-expense';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { formatDate } from '@/utils';
import { Users } from 'lucide-react';
import { useState } from 'react';
import ActionCard from '../action-card';
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
        className={`${getCardStyling()} shadow-sm overflow-hidden mb-3 rounded-2xl`}
        contentClassName="p-0"
        hoverAnimation={true}
      >
        {/* Header with Category Dot and Expense Description */}
        <div className="flex items-center gap-3 p-4 pb-2">
          {/* Category Dot */}

          {/* Expense Description as Header */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
              {expense.description}
            </h3>
          </div>
        </div>

        {/* Payer Info and Date */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserAvatar
                user={expense.payer}
                shouldShowName={true}
                showAsYou={expense.paid_by === currentUser.id}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(expense.date)}
            </p>
          </div>
        </div>

        {/* Amount Display */}
        <div className="mx-4 mb-4 bg-gray-100/80 dark:bg-gray-800 rounded-2xl p-6 text-center">
          <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            ${expense.your_share.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            of ${expense.amount.toFixed(2)} total
          </div>
        </div>

        {/* Status Badges */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Status Badge */}
            <Badge
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                isSettled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
              }`}
            >
              {isSettled
                ? 'settled'
                : `${settledCount}/${expense.splits.length} paid`}
            </Badge>

            {/* Category Badge */}
            {expense.category && (
              <Badge
                variant="secondary"
                className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-medium"
              >
                {expense.category}
              </Badge>
            )}

            {/* Participants Count */}
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ml-auto">
              <Users className="w-3 h-3" />
              <span>{expense.splits.length}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 pb-4">
          {expense.status === 'pending' && !isCurrentUserSettled ? (
            <div className="space-y-2">
              {isPayer ? (
                <Button className="w-full" onClick={() => onSettle?.(expense)}>
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
                    <Button className="w-full ">
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
                trigger={<Button className="w-full ">View Details</Button>}
              />
            </div>
          ) : (
            <ExpenseDetailsDialog
              expense={expense}
              currentUser={currentUser}
              householdMembers={householdMembers}
              onSettle={onSettle}
              onEditExpense={onEditExpense}
              onDeleteExpense={onDeleteExpense}
              onExpenseUpdated={onExpenseUpdated}
              trigger={<Button className="w-full ">View Details</Button>}
            />
          )}
        </div>
      </ActionCard>

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
