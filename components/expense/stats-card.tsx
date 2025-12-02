'use client';

import ActiveBalancesDialog from '@/components/expense/active-balances-dialog';
import { Balance } from '@/lib/supabase/types';
import { DollarSign, Receipt, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface ExpenseStatsCardsProps {
  totalExpenses: number;
  yourTotalShare: number;
  pendingCount: number;
  yourNetBalance: number;
  yourBalances: Balance[];
  currentUserId?: string;
}

export default function ExpenseStatsCards({
  totalExpenses,
  yourTotalShare,
  pendingCount,
  yourNetBalance,
  yourBalances,
  currentUserId,
}: ExpenseStatsCardsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Determine balance status
  const getBalanceStatus = () => {
    if (Math.abs(yourNetBalance) < 0.01) {
      return { text: 'All settled up', color: 'text-green-600 dark:text-green-400' };
    } else if (yourNetBalance > 0) {
      return { text: "You're owed money", color: 'text-green-600 dark:text-green-400' };
    } else {
      return { text: 'You owe money', color: 'text-red-600 dark:text-red-400' };
    }
  };

  const balanceStatus = getBalanceStatus();
  const activeBalancesCount = yourBalances.length;

  const quickStats = [
    {
      icon: DollarSign,
      label: 'Total This Month',
      value: `$${totalExpenses.toFixed(2)}`,
      subtitle: 'Household expenses',
    },
    {
      icon: TrendingUp,
      label: 'Your Share',
      value: `$${yourTotalShare.toFixed(2)}`,
      subtitle: 'Your portion',
    },
    {
      icon: Receipt,
      label: 'Pending',
      value: pendingCount,
      subtitle: 'Unsettled expenses',
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Metric - Net Balance */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 backdrop-blur-sm cursor-pointer"
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
        </div>
        <div className={`text-5xl font-bold ${balanceStatus.color}`}>
          {yourNetBalance >= 0 ? '+' : ''}${Math.abs(yourNetBalance).toFixed(2)}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {balanceStatus.text}
        </p>
        {activeBalancesCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {activeBalancesCount} active balance{activeBalancesCount !== 1 ? 's' : ''}
            <span className="hidden sm:inline"> • Click to view</span>
          </p>
        )}
      </motion.div>

      {/* Quick Stats List */}
      <div className="space-y-2">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between p-4 rounded-xl bg-background/60 hover:bg-background/80 transition-colors cursor-pointer active:bg-muted"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted">
                <stat.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
              </div>
            </div>
            <div className="text-xl font-semibold text-foreground">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Active Balances Dialog */}
      <ActiveBalancesDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        balances={yourBalances}
        currentUserId={currentUserId}
      />
    </motion.div>
  );
}
