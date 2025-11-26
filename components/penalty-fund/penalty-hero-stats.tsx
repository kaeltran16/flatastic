'use client';

import StatsHeroLayout, {
    HeroMetric,
    QuickStat,
} from '@/components/dashboard/stats-hero-layout';
import { Award, CircleSlash2, TrendingUp } from 'lucide-react';

interface PenaltyHeroStatsProps {
  fundBalance: number;
  monthlyAdditions: number;
  userBalance: {
    penalties: number;
    rewards: number;
    net: number;
  } | undefined;
  loading?: boolean;
}

export default function PenaltyHeroStats({
  fundBalance,
  monthlyAdditions,
  userBalance,
  loading = false,
}: PenaltyHeroStatsProps) {
  if (loading) {
    return <StatsHeroLayout heroMetric={{} as HeroMetric} quickStats={[]} loading={true} />;
  }

  const heroMetric: HeroMetric = {
    value: fundBalance,
    label: 'Household Fund Balance',
    prefix: '$',
    color: 'text-emerald-600 dark:text-emerald-400',
    subtitle: 'Total accumulated fund',
  };

  const quickStats: QuickStat[] = [
    {
      icon: TrendingUp,
      label: 'Your Balance',
      value: `$${(userBalance?.net || 0).toFixed(2)}`,
      subtitle: (userBalance?.net || 0) > 0 ? 'Net Rewards' : 'Net Penalties',
      color: (userBalance?.net || 0) >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      icon: Award,
      label: 'Monthly Additions',
      value: `${monthlyAdditions >= 0 ? '+' : ''}${monthlyAdditions.toFixed(2)}`,
      subtitle: 'Added this month',
      color: 'text-emerald-600',
    },
    {
      icon: CircleSlash2,
      label: 'Your Penalties',
      value: `$${(userBalance?.penalties || 0).toFixed(2)}`,
      subtitle: 'Total penalties',
      color: 'text-red-600',
    },
  ];

  return <StatsHeroLayout heroMetric={heroMetric} quickStats={quickStats} />;
}
