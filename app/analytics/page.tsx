'use client';

import { ChoreChart } from '@/components/analytics/chore-chart';
import { ContributionChart } from '@/components/analytics/contribution-chart';
import { ExpenseChart } from '@/components/analytics/expense-chart';
import { useAnalytics } from '@/hooks/use-analytics';
import { useProfile } from '@/hooks/use-profile';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { profile } = useProfile();
  const { data, isLoading } = useAnalytics(profile?.household_id || undefined);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChoreChart data={data.choreStats} />
        <ExpenseChart data={data.expenseStats} />
        <div className="md:col-span-2">
          <ContributionChart data={data.contributionStats} />
        </div>
      </div>
    </div>
  );
}
