import StatsHeroLayout from '@/components/dashboard/stats-hero-layout';
import { ChoreWithProfile } from '@/lib/supabase/schema.alias';
import { formatDateRelatively } from '@/utils';
import { AlertCircle, CheckCircle2, ListTodo } from 'lucide-react';

interface DashboardStats {
  latestChore: ChoreWithProfile | null;
  unfinishedChores: ChoreWithProfile[];
  lastCompletedChore: ChoreWithProfile | null;
  totalPending: number;
  totalOverdue: number;
}

interface AdminHeroStatsProps {
  stats: DashboardStats;
  loading?: boolean;
}

export default function AdminHeroStats({ stats, loading }: AdminHeroStatsProps) {
  const heroMetric = {
    value: stats.totalPending,
    label: 'Pending Chores',
    prefix: '',
    color: stats.totalPending > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400',
  };

  const quickStats = [
    {
      icon: AlertCircle,
      label: 'Overdue',
      value: stats.totalOverdue,
      subtitle: 'Requires attention',
      color: stats.totalOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
    },
    {
      icon: ListTodo,
      label: 'Unfinished',
      value: stats.unfinishedChores.length,
      subtitle: 'In progress',
    },
    {
      icon: CheckCircle2,
      label: 'Last Completed',
      value: stats.lastCompletedChore ? formatDateRelatively(stats.lastCompletedChore.updated_at!) : '-',
      subtitle: stats.lastCompletedChore ? `by ${stats.lastCompletedChore.assignee?.full_name?.split(' ')[0]}` : 'No recent activity',
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
