'use client';

import { AnalyticsSummary } from '@/components/analytics/analytics-summary';
import { ChoreChart } from '@/components/analytics/chore-chart';
import { ChoreTrendChart } from '@/components/analytics/chore-trend-chart';
import { ContributionChart } from '@/components/analytics/contribution-chart';
import { ExpenseChart } from '@/components/analytics/expense-chart';
import { ExpenseTrendChart } from '@/components/analytics/expense-trend-chart';
import { useAnalytics } from '@/hooks/use-analytics';
import { useProfile } from '@/hooks/use-profile';
import { BarChart3, Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { profile } = useProfile();
  const { data, isLoading } = useAnalytics(profile?.household_id || undefined);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Data Available</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start tracking chores and expenses to see analytics here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Track your household&apos;s activity and spending patterns
        </p>
      </div>

      {/* Summary Stats */}
      <AnalyticsSummary totals={data.totals} comparison={data.comparison} />

      {/* Trend Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseTrendChart data={data.expenseTrends} />
        <ChoreTrendChart data={data.choreTrends} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChoreChart
          data={data.choreStats}
          comparison={data.comparison.choreChange}
        />
        <ExpenseChart
          data={data.expenseStats}
          comparison={data.comparison.expenseChange}
        />
      </div>

      {/* Full Width Contribution Chart */}
      <ContributionChart data={data.contributionStats} />
    </div>
  );
}
