import RecentChores from '@/components/dashboard/chore';
import RecentExpenses from '@/components/dashboard/expense';
import DashboardHeader from '@/components/dashboard/header';
import ProgressCards from '@/components/dashboard/progress-cards';
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

  const [chores, expenses, stats] = await Promise.all([
    getChores(),
    getExpenses(),
    getHouseholdStats(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardHeader profile={profile} />

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <RecentChores chores={chores.slice(0, 5)} />
        </div>

        <div className="space-y-6">
          <RecentExpenses expenses={expenses.slice(0, 5)} />
          <ProgressCards stats={stats} />
        </div>
      </div>
    </div>
  );
}
