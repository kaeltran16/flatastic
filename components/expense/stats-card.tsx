import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface Balance {
  name: string;
  amount: number;
  type: 'owed' | 'owes';
}

interface ExpenseStatsCardsProps {
  totalExpenses: number;
  yourTotalShare: number;
  pendingCount: number;
  yourBalance: Balance | undefined;
}

export default function ExpenseStatsCards({
  totalExpenses,
  yourTotalShare,
  pendingCount,
  yourBalance,
}: ExpenseStatsCardsProps) {
  const cardAnimation = {
    whileHover: { scale: 1.05, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
    whileTap: { scale: 0.95 },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8 px-4 sm:px-0">
      <motion.div {...cardAnimation}>
        <Card className="transition-shadow cursor-pointer">
          <CardHeader className="flex items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-none">
              Total This Month
            </CardTitle>
            <DollarSign className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold truncate">
              ${totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation}>
        <Card className="transition-shadow cursor-pointer">
          <CardHeader className="flex items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-none">
              Your Share
            </CardTitle>
            <TrendingUp className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold truncate">
              ${yourTotalShare.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation}>
        <Card className="transition-shadow cursor-pointer">
          <CardHeader className="flex items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-none">
              Your Balance
            </CardTitle>
            <Users className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl sm:text-3xl font-bold truncate ${
                yourBalance?.type === 'owed' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {yourBalance
                ? `${
                    yourBalance.type === 'owed' ? '+' : '-'
                  }$${yourBalance.amount.toFixed(2)}`
                : '$0.00'}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {yourBalance?.type === 'owed'
                ? "You're owed money"
                : yourBalance?.type === 'owes'
                ? 'You owe money'
                : 'All settled'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation}>
        <Card className="transition-shadow cursor-pointer">
          <CardHeader className="flex items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-none">
              Pending
            </CardTitle>
            <Receipt className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-orange-600 truncate">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
