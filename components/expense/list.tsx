import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { Receipt } from 'lucide-react';
import ExpenseCard from './card';

interface ExpenseListProps {
  expenses?: ExpenseWithDetails[];
  currentUser: Profile;
  onExpenseAdded: () => void;
  onAddExpense: (data: ExpenseFormData) => Promise<void>;
  onViewDetails: (expense: ExpenseWithDetails) => void;
  onSettle: (expense: ExpenseWithDetails) => void;
}

export default function ExpenseList({
  expenses,
  currentUser,
  onExpenseAdded,
  onAddExpense,
  onViewDetails,
  onSettle,
}: ExpenseListProps) {
  console.log(expenses);
  if (expenses?.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center sm:p-12">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4 px-4 sm:px-0 max-w-xs mx-auto">
            Start by adding your first shared expense
          </p>
          {currentUser.household_id && (
            <div className="flex justify-center">
              <AddExpenseButton
                onExpenseAdded={onExpenseAdded}
                onAddExpense={onAddExpense}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    // Responsive vertical spacing with some padding on small screen
    <div className="space-y-4 px-4 sm:px-0">
      {expenses?.map((expense) => (
        <ExpenseCard
          currentUser={currentUser}
          key={expense.id}
          expense={expense}
          onViewDetails={onViewDetails}
          onSettle={onSettle}
        />
      ))}
    </div>
  );
}
