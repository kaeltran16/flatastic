'use client';

import { useHouseholdStats } from '@/hooks/use-household-stats';
import { Calendar, DollarSign, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import StatsHeroLayout, { HeroMetric, QuickStat } from './stats-hero-layout';

export default function HeroStats() {
  const router = useRouter();
  const { stats, loading } = useHouseholdStats();

  if (loading || !stats) {
    return <StatsHeroLayout heroMetric={{} as HeroMetric} quickStats={[]} loading={true} />;
  }

  const heroMetric: HeroMetric = {
    value: stats.balance,
    label: 'Your Balance',
    prefix: stats.balance >= 0 ? '+$' : '-$',
    color: stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
    subtitle: stats.balance >= 0 ? "You're owed money" : 'You owe money',
    onClick: () => router.push('/payments'),
  };

  const quickStats: QuickStat[] = [
    {
      icon: Calendar,
      label: 'Pending Chores',
      value: stats.pendingChores,
      subtitle: `${stats.overdueChores} overdue`,
      onClick: () => router.push('/chores'),
    },
    {
      icon: Users,
      label: 'Members',
      value: stats.householdMembers,
      subtitle: 'Including you',
      onClick: () => router.push('/household'),
    },
    {
      icon: DollarSign,
      label: 'This Month',
      value: `$${Math.round(stats.monthlyExpenses)}`,
      subtitle: 'Total expenses',
      onClick: () => router.push('/expenses'),
    },
  ];

  return <StatsHeroLayout heroMetric={heroMetric} quickStats={quickStats} />;
}
