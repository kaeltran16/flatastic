import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Profile } from '@/lib/supabase/types';
import { DollarSign, Receipt } from 'lucide-react';
import Link from 'next/link';

interface Balance {
  name: string;
  amount: number;
  type: 'owed' | 'owes';
}

interface BalancesSidebarProps {
  balances: Balance[];
  currentUser: Profile | null;
  onExpenseAdded: () => void;
  onAddExpense: (data: ExpenseFormData) => Promise<void>;
}

export default function BalancesSidebar({
  balances,
  currentUser,
  onExpenseAdded,
  onAddExpense,
}: BalancesSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Current Balances</CardTitle>
          <CardDescription>Who owes what to whom</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {balances.length === 0 ? (
            <p className="text-muted-foreground text-sm">All settled up! 🎉</p>
          ) : (
            balances.map((balance, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {balance.name === 'You'
                        ? currentUser?.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                        : balance.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{balance.name}</span>
                </div>
                <div
                  className={`font-bold ${
                    balance.type === 'owed' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {balance.type === 'owed' ? '+' : '-'}$
                  {balance.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser?.household_id && (
            <AddExpenseButton
              className="w-full justify-start"
              onExpenseAdded={onExpenseAdded}
              onAddExpense={onAddExpense}
            />
          )}
          <Link href="/expenses/settle-payments" className="block">
            <Button
              className="w-full justify-start bg-transparent"
              variant="outline"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Settle Payments
            </Button>
          </Link>
          <Link href="/expenses/receipts" className="block">
            <Button
              className="w-full justify-start bg-transparent"
              variant="outline"
            >
              <Receipt className="h-4 w-4 mr-2" />
              View Receipts
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
