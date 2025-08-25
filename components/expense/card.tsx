import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import {
  CheckCircle2,
  Clock,
  Edit,
  MoreVertical,
  Trash2,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import UserAvatar from '../user-avatar';
import DeleteExpenseDialog from './delete-expense-dialog';
import ExpenseDetailsDialog from './details-dialog';
import EditExpenseDialog, { ExpenseFormData } from './edit-expense-dialog';

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

  // Determine card styling based on user's relationship to expense
  const getCardStyling = () => {
    if (isSettled)
      return 'border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50';
    if (isPayer && !isCurrentUserSettled)
      return 'border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50';
    if (!isPayer && !isCurrentUserSettled)
      return 'border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50';
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2, ease: 'easeOut' },
        }}
        whileTap={{ scale: 0.98 }}
        className="mb-3"
      >
        <Card
          className={`${getCardStyling()} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}
        >
          <CardContent className="p-0">
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
                        <UserAvatar
                          user={currentUser}
                          shouldShowName={true}
                          showAsYou={true}
                        />
                      </div>
                      <span className="text-gray-400">•</span>
                      <span>{formatDate(expense.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Amount & Menu */}
                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${expense.your_share.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      ${expense.amount.toFixed(2)} total
                    </div>
                  </div>

                  {isPayer && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-white/60 dark:hover:bg-gray-800/60"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setIsEditDialogOpen(true)}
                          disabled={!canModify}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Expense
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setIsDeleteDialogOpen(true)}
                          disabled={!canModify}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Expense
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
          </CardContent>
        </Card>
      </motion.div>

      <EditExpenseDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        expense={expense}
        onEditExpense={onEditExpense!}
        householdMembers={householdMembers}
        currentUser={currentUser}
      />

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
