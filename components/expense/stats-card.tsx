import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Balance } from '@/lib/supabase/types';
import { DollarSign, Receipt, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface ExpenseStatsCardsProps {
  totalExpenses: number;
  yourTotalShare: number;
  pendingCount: number;
  yourNetBalance: number;
  yourBalances: Balance[];
}

export default function ExpenseStatsCards({
  totalExpenses,
  yourTotalShare,
  pendingCount,
  yourNetBalance,
  yourBalances,
}: ExpenseStatsCardsProps) {
  const cardAnimation = {
    whileHover: { scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' },
    whileTap: { scale: 0.98 },
  };

  // Determine balance status
  const getBalanceStatus = () => {
    if (Math.abs(yourNetBalance) < 0.01) {
      return { text: 'All settled', color: 'text-green-600' };
    } else if (yourNetBalance > 0) {
      return { text: "You're owed money", color: 'text-green-600' };
    } else {
      return { text: 'You owe money', color: 'text-red-600' };
    }
  };

  const balanceStatus = getBalanceStatus();

  // Count total unsettled balances involving the user
  const activeBalancesCount = yourBalances.length;

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
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balanceStatus.color}`}>
              {yourNetBalance >= 0 ? '+' : ''}${yourNetBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {balanceStatus.text}
            </p>
            {activeBalancesCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {activeBalancesCount} active balance
                {activeBalancesCount !== 1 ? 's' : ''}
              </p>
            )}
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
            <p className="text-xs text-muted-foreground mt-1">
              Unsettled expenses
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
