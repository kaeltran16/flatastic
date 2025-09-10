import RecentChores from '@/components/dashboard/chore';
import RecentExpenses from '@/components/dashboard/expense';
import DashboardHeader from '@/components/dashboard/header';
import ProgressCards from '@/components/dashboard/progress-cards';
import QuickActions from '@/components/dashboard/quick-actions';

import StatsCards from '@/components/dashboard/stats-card';
import { getProfile } from '@/lib/actions/user';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const profile = await getProfile();

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardHeader profile={profile} />

      {profile.household_id && profile.id ? (
        <>
          <StatsCards />
          <QuickActions
            currentUser={profile}
            householdId={profile.household_id!}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-6">
              <RecentChores />
            </div>
            <div className="space-y-6">
              <RecentExpenses />
              <ProgressCards />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-bold">
            You are not part of any household
          </h1>
          <Link href="/households" className="text-sm text-gray-500">
            Please join a household to get started
          </Link>
        </div>
      )}
    </div>
  );
}
