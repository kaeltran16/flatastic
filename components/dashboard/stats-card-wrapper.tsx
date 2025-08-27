import StatsCards from '@/components/dashboard/stats-card';
import { getHouseholdStats } from '@/lib/actions/household';

async function StatsCardsWrapper() {
  const stats = await getHouseholdStats();
  return <StatsCards stats={stats} />;
}

export default StatsCardsWrapper;
