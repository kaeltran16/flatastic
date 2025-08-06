import { ExpenseWithDetails } from '@/app/expenses/page';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'motion/react';

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
  onViewDetails?: (expense: ExpenseWithDetails) => void;
  onSettle?: (expense: ExpenseWithDetails) => void;
}

export default function ExpenseCard({
  expense,
  onViewDetails,
  onSettle,
}: ExpenseCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'groceries':
        return 'bg-green-100 text-green-800';
      case 'utilities':
        return 'bg-blue-100 text-blue-800';
      case 'household':
        return 'bg-purple-100 text-purple-800';
      case 'food':
        return 'bg-orange-100 text-orange-800';
      case 'transportation':
        return 'bg-yellow-100 text-yellow-800';
      case 'entertainment':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.97 }}
      className="mb-4"
    >
      <Card className="transition-shadow">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left content: description, badges, details */}
            <div className="flex flex-col flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg break-words flex-grow">
                  {expense.description}
                </h3>
                {expense.category && (
                  <Badge className={getCategoryColor(expense.category)}>
                    {expense.category}
                  </Badge>
                )}
                <Badge
                  variant={
                    expense.status === 'settled' ? 'default' : 'secondary'
                  }
                >
                  {expense.status}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-1 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-2 whitespace-nowrap mb-1 sm:mb-0">
                  <span>Paid by</span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {expense.payer_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-xs">
                    {expense.payer_name}
                  </span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span>{formatDate(expense.date)}</span>
                <span className="hidden sm:inline">•</span>
                <span>Split {expense.splits.length} ways</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Your share:{' '}
                <span className="font-medium text-foreground">
                  ${expense.your_share.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Right content: amount and buttons */}
            <div className="flex flex-col items-end w-full sm:w-auto gap-3 mt-4 sm:mt-0">
              <div className="text-2xl font-bold break-words">
                ${expense.amount.toFixed(2)}
              </div>
              <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => onViewDetails?.(expense)}
                >
                  View Details
                </Button>
                {expense.status === 'pending' && (
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => onSettle?.(expense)}
                  >
                    Settle
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
