import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Profile } from '@/lib/supabase/schema.alias';
import Link from 'next/link';

interface ExpensesNavigationProps {
  currentUser: Profile | null;
  onExpenseAdded: () => void;
  onAddExpense: (data: ExpenseFormData) => Promise<void>;
}

export default function ExpensesNavigation({
  currentUser,
  onExpenseAdded,
  onAddExpense,
}: ExpensesNavigationProps) {
  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">Flatastic</span>
            </Link>
            <span className="ml-4 text-muted-foreground">/</span>
            <span className="ml-4 font-medium">Expenses</span>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser?.household_id && (
              <AddExpenseButton
                onExpenseAdded={onExpenseAdded}
                onAddExpense={onAddExpense}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
