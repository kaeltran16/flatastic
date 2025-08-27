import DashboardHeader from '@/components/dashboard/header';
import ProgressCardsWrapper from '@/components/dashboard/progress-card-wrapper';
import RecentChoresWrapper from '@/components/dashboard/recent-chores-wrapper';
import RecentExpensesWrapper from '@/components/dashboard/recent-expenses.wrapper';
import StatsCardsWrapper from '@/components/dashboard/stats-card-wrapper';
import { LoadingSpinner } from '@/components/household/loading';
import { getProfile } from '@/lib/actions/user';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function Dashboard() {
  // Only fetch critical user profile data server-side
  const profile = await getProfile();

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Static content - rendered at build time */}
      <DashboardHeader profile={profile} />

      {/* Dynamic content wrapped in Suspense - streams in after initial load */}
      <Suspense fallback={<LoadingSpinner />}>
        <StatsCardsWrapper />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <RecentChoresWrapper />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <RecentExpensesWrapper />
          </Suspense>

          <Suspense fallback={<LoadingSpinner />}>
            <ProgressCardsWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
