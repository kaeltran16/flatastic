import RecentChores from '@/components/dashboard/chore';
import RecentExpenses from '@/components/dashboard/expense';
import DashboardHeader from '@/components/dashboard/header';
import HeroStats from '@/components/dashboard/hero-stats';
import ProgressCards from '@/components/dashboard/progress-cards';
import { getProfile } from '@/lib/actions/user';
import Link from 'next/link';
import { redirect } from 'next/navigation';


export const MAX_DASHBOARD_ITEMS = 5;

export default async function Dashboard() {
  const profile = await getProfile();

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <DashboardHeader profile={profile} />

      {profile.household_id && profile.id ? (
        <div className="space-y-6">
          {/* Hero Stats */}
          <HeroStats />
          
          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground px-1">Recent Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RecentChores />
              <RecentExpenses />
            </div>
          </div>

          {/* Progress */}
          <ProgressCards />
        </div>
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
