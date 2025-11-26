import StatsHeroLayout from '@/components/dashboard/stats-hero-layout';
import { RotateCw, TrendingUp, Users } from 'lucide-react';

interface HouseholdStats {
  totalChores: number;
  completedChores: number;
  pendingChores: number;
  overdueChores: number;
  completionRate: number;
  activeRecurringTemplates: number;
}

interface RecurringHeroStatsProps {
  stats: HouseholdStats | undefined;
  availableMembersCount: number;
  totalMembersCount: number;
  loading?: boolean;
}

export default function RecurringHeroStats({
  stats,
  availableMembersCount,
  totalMembersCount,
  loading,
}: RecurringHeroStatsProps) {
  const heroMetric = {
    value: stats?.totalChores || 0,
    label: 'Total Chores',
    prefix: '',
    color: 'text-blue-600 dark:text-blue-400',
    subtitle: `${stats?.pendingChores || 0} pending, ${stats?.completedChores || 0} completed`,
  };

  const quickStats = [
    {
      icon: TrendingUp,
      label: 'Completion Rate',
      value: `${stats?.completionRate || 0}%`,
      subtitle: 'All time',
      color: (stats?.completionRate || 0) >= 80 ? 'text-emerald-600' : 'text-orange-600',
    },
    {
      icon: RotateCw,
      label: 'Recurring Templates',
      value: stats?.activeRecurringTemplates || 0,
      subtitle: 'Active automations',
    },
    {
      icon: Users,
      label: 'Available Members',
      value: `${availableMembersCount}/${totalMembersCount}`,
      subtitle: 'Ready for assignments',
      color: availableMembersCount > 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  return (
    <StatsHeroLayout
      heroMetric={heroMetric}
      quickStats={quickStats}
      loading={loading}
      className="mb-8"
    />
  );
}
