import RecentExpenses from '@/components/dashboard/expense';
import { getExpenses } from '@/lib/actions/expense';

async function RecentExpensesWrapper() {
  const expenses = await getExpenses();
  return <RecentExpenses expenses={expenses.slice(0, 5)} />;
}

export default RecentExpensesWrapper;
