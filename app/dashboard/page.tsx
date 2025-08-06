import RecentChores from '@/components/dashboard/chore';
import RecentExpenses from '@/components/dashboard/expense';
import DashboardHeader from '@/components/dashboard/header';
import ProgressCards from '@/components/dashboard/progress-cards';
import QuickActions from '@/components/dashboard/quick-action';
import StatsCards from '@/components/dashboard/stats-card';
import { getChores } from '@/lib/actions/chore';
import { getExpenses } from '@/lib/actions/expense';
import { getHouseholdStats } from '@/lib/actions/household';
import { getProfile } from '@/lib/actions/user';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const profile = await getProfile();

  if (!profile) {
    redirect('/auth/login');
  }

  // Fetch all data in parallel
  const [chores, expenses, stats] = await Promise.all([
    getChores(),
    getExpenses(),
    getHouseholdStats(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardHeader profile={profile} />

      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <RecentChores chores={chores.slice(0, 5)} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions user={profile} />
          <RecentExpenses expenses={expenses.slice(0, 5)} />
          <ProgressCards stats={stats} />
        </div>
      </div>
    </div>
  );
}
