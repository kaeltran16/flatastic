import ProgressCards from '@/components/dashboard/progress-cards';
import { getHouseholdStats } from '@/lib/actions/household';

async function ProgressCardsWrapper() {
  const stats = await getHouseholdStats();
  return <ProgressCards stats={stats} />;
}

export default ProgressCardsWrapper;
