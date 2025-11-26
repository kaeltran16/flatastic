'use client';

import { LoadingSpinner } from '@/components/household/loading';
import { Award, CircleSlash2, DollarSign, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface FundHeroStatsProps {
  fundBalance: number;
  monthlyAdditions: number;
  userBalance: {
    penalties: number;
    rewards: number;
    net: number;
  } | undefined;
  balanceLoading: boolean;
  monthlyLoading: boolean;
  userBalanceLoading: boolean;
  activeBalancesCount: number;
}

export function FundHeroStats({
  fundBalance,
  monthlyAdditions,
  userBalance,
  balanceLoading,
  monthlyLoading,
  userBalanceLoading,
  activeBalancesCount,
}: FundHeroStatsProps) {
  const getBalanceStatus = () => {
    const net = userBalance?.net || 0;
    if (Math.abs(net) < 0.01) {
      return { text: 'All settled up', color: 'text-green-600 dark:text-green-400' };
    } else if (net > 0) {
      return { text: "You have rewards", color: 'text-green-600 dark:text-green-400' };
    } else {
      return { text: 'You owe penalties', color: 'text-red-600 dark:text-red-400' };
    }
  };

  const balanceStatus = getBalanceStatus();
  const net = userBalance?.net || 0;

  const quickStats = [
    {
      icon: DollarSign,
      label: 'Household Fund',
      value: balanceLoading ? '...' : `$${fundBalance.toFixed(2)}`,
      subtitle: 'Total balance',
    },
    {
      icon: TrendingUp,
      label: 'This Month',
      value: monthlyLoading ? '...' : `${monthlyAdditions >= 0 ? '+' : ''}$${Math.abs(monthlyAdditions).toFixed(2)}`,
      subtitle: 'Monthly change',
    },
    {
      icon: CircleSlash2,
      label: 'Your Penalties',
      value: userBalanceLoading ? '...' : `$${(userBalance?.penalties || 0).toFixed(2)}`,
      subtitle: 'Amount owed',
    },
    {
      icon: Award,
      label: 'Your Rewards',
      value: userBalanceLoading ? '...' : `$${(userBalance?.rewards || 0).toFixed(2)}`,
      subtitle: 'Credits earned',
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Metric - Your Net Balance */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 backdrop-blur-sm"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Your Net Balance</span>
        </div>
        <div className={`text-5xl font-bold ${balanceStatus.color}`}>
          {userBalanceLoading ? (
            <LoadingSpinner />
          ) : (
            <span>
              {net >= 0 ? '+' : ''}${Math.abs(net).toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {balanceStatus.text}
        </p>
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
    </motion.div>
  );
}
