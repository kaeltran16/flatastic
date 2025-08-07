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
    whileHover: { scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
    whileTap: { scale: 0.98 },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <motion.div {...cardAnimation} className="h-full">
        <Card className="h-full transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation} className="h-full">
        <Card className="h-full transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Share</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${yourTotalShare.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation} className="h-full">
        <Card className="h-full transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                yourBalance?.type === 'owed' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {yourBalance
                ? `${
                    yourBalance.type === 'owed' ? '+' : '-'
                  }$${yourBalance.amount.toFixed(2)}`
                : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {yourBalance?.type === 'owed'
                ? "You're owed money"
                : yourBalance?.type === 'owes'
                ? 'You owe money'
                : 'All settled'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div {...cardAnimation} className="h-full">
        <Card className="h-full transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
