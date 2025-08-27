import RecentChores from '@/components/dashboard/chore';
import { getChores } from '@/lib/actions/chore';

async function RecentChoresWrapper() {
  const chores = await getChores();
  return <RecentChores chores={chores.slice(0, 5)} />;
}

export default RecentChoresWrapper;
