import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { motion } from 'motion/react';

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
  onViewDetails?: (expense: ExpenseWithDetails) => void;
  onSettle?: (expense: ExpenseWithDetails) => void;
  currentUser: Profile;
}

export default function ExpenseCard({
  expense,
  onViewDetails,
  onSettle,
  currentUser,
}: ExpenseCardProps) {
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
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const isPayer = expense.paid_by === currentUser.id;
  console.log('expense', expense);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 },
      }}
      className="mb-3 touch-manipulation"
      layout
    >
      <Card className="transition-all duration-200 border-0 shadow-sm hover:shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          {/* Mobile-first layout */}
          <div className="space-y-4">
            {/* Header row - always horizontal */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight truncate pr-2">
                  {expense.description}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  {expense.category && (
                    <Badge
                      className={`${getCategoryColor(
                        expense.category
                      )} text-xs px-2 py-0.5 font-medium`}
                      variant="secondary"
                    >
                      {expense.category}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      expense.status === 'settled' ? 'default' : 'secondary'
                    }
                    className="text-xs px-2 py-0.5"
                  >
                    {expense.status}
                  </Badge>
                </div>
              </div>

              {/* Amount - prominent on mobile */}
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold">
                  ${expense.amount.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Your share:{' '}
                  <span className="font-medium text-foreground">
                    ${expense.your_share.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Paid by</span>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs font-medium">
                    {expense.payer_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate max-w-[120px]">
                  {isPayer ? 'You' : expense.payer_name}
                </span>
              </div>

              <span className="text-muted-foreground/60">•</span>
              <span className="whitespace-nowrap">
                {formatDate(expense.date)}
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="whitespace-nowrap">
                {expense.splits.length} people
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-sm font-medium"
                onClick={() => onViewDetails?.(expense)}
              >
                Details
              </Button>
              {expense.status === 'pending' && (
                <Button
                  size="sm"
                  className="flex-1 h-9 text-sm font-medium"
                  onClick={() => onSettle?.(expense)}
                >
                  {isPayer ? 'Mark Paid' : 'Pay Back'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
