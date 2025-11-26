'use client';

import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';

interface ChoreHeroStatsProps {
  pendingCount: number;
  overdueCount: number;
  completedThisWeek: number;
  totalChores: number;
  householdMemberCount?: number;
  onFilterChange?: (filter: 'all' | 'pending' | 'overdue' | 'completed') => void;
}

export default function ChoreHeroStats({
  pendingCount,
  overdueCount,
  completedThisWeek,
  totalChores,
  householdMemberCount = 0,
  onFilterChange,
}: ChoreHeroStatsProps) {
  // Determine hero metric based on what's most important
  const heroMetric = useMemo(() => {
    if (overdueCount > 0) {
      return {
        value: overdueCount,
        label: 'Overdue Chores',
        color: 'text-red-600 dark:text-red-400',
        subtitle: 'Need immediate attention',
      };
    } else if (pendingCount > 0) {
      return {
        value: pendingCount,
        label: 'Pending Chores',
        color: 'text-orange-600 dark:text-orange-400',
        subtitle: 'Ready to complete',
      };
    } else {
      return {
        value: completedThisWeek,
        label: 'Completed This Week',
        color: 'text-green-600 dark:text-green-400',
        subtitle: 'Great work!',
      };
    }
  }, [overdueCount, pendingCount, completedThisWeek]);

  const quickStats = [
    {
      icon: Calendar,
      label: 'Pending',
      value: pendingCount,
      subtitle: 'To be done',
      filter: 'pending' as const,
    },
    {
      icon: Clock,
      label: 'Overdue',
      value: overdueCount,
      subtitle: 'Past due date',
      filter: 'overdue' as const,
    },
    {
      icon: CheckCircle2,
      label: 'Completed',
      value: completedThisWeek,
      subtitle: 'This week',
      filter: 'completed' as const,
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Metric */}
      <motion.div
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 backdrop-blur-sm"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2 mb-2">
          {overdueCount > 0 ? (
            <Clock className="h-5 w-5 text-muted-foreground" />
          ) : pendingCount > 0 ? (
            <Calendar className="h-5 w-5 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {heroMetric.label}
          </span>
        </div>
        <div className={`text-5xl font-bold ${heroMetric.color}`}>
          {heroMetric.value}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {heroMetric.subtitle}
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
            onClick={() => onFilterChange?.(stat.filter)}
            className="flex items-center justify-between p-4 rounded-xl bg-background/60 hover:bg-background/80 transition-colors cursor-pointer active:bg-muted"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted">
                <stat.icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </div>
              </div>
            </div>
            <div className="text-xl font-semibold text-foreground">
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
