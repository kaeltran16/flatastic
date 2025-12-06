'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AnalyticsComparison, AnalyticsTotals } from '@/hooks/use-analytics';
import {
    CheckCircle2,
    DollarSign,
    Minus,
    TrendingDown,
    TrendingUp,
    Trophy,
} from 'lucide-react';

interface AnalyticsSummaryProps {
  totals: AnalyticsTotals;
  comparison: AnalyticsComparison;
}

function TrendIndicator({
  value,
  suffix = '%',
  invertColors = false,
}: {
  value: number;
  suffix?: string;
  invertColors?: boolean;
}) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  const isGood = invertColors ? !isPositive : isPositive;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${
        isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}
      {value}
      {suffix} vs last month
    </span>
  );
}

export function AnalyticsSummary({ totals, comparison }: AnalyticsSummaryProps) {
  const stats = [
    {
      title: 'Chores Completed',
      value: totals.totalChoresCompleted,
      trend: <TrendIndicator value={comparison.choreChange} />,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
    },
    {
      title: 'Total Expenses',
      value: `$${totals.totalExpenses.toLocaleString()}`,
      trend: <TrendIndicator value={comparison.expenseChange} invertColors />,
      icon: DollarSign,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
    },
    {
      title: 'Top Contributor',
      value: totals.topContributor,
      subvalue: `$${totals.topContributorAmount.toLocaleString()}`,
      icon: Trophy,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      title: 'Completion Rate',
      value: `${totals.choreCompletionRate}%`,
      progress: totals.choreCompletionRate,
      icon: TrendingUp,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="relative overflow-hidden transition-all hover:shadow-lg"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  {'subvalue' in stat && stat.subvalue && (
                    <p className="text-sm text-muted-foreground">
                      {stat.subvalue}
                    </p>
                  )}
                  {'trend' in stat && stat.trend}
                  {'progress' in stat && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
