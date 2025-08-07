import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Profile } from '@/lib/supabase/types';
import {
  ChevronRight,
  DollarSign,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
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
  // Calculate total amounts owed and owing
  const totalOwed = balances
    .filter((b) => b.type === 'owed')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalOwing = balances
    .filter((b) => b.type === 'owes')
    .reduce((sum, b) => sum + b.amount, 0);

  const netBalance = totalOwed - totalOwing;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Balance Summary - Mobile Optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Current Balances
              {balances.length > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {balances.length}
                </Badge>
              )}
            </CardTitle>
            {netBalance !== 0 && (
              <CardDescription className="flex items-center gap-2">
                {netBalance > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Net: +${Math.abs(netBalance).toFixed(2)} owed to you
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      Net: -${Math.abs(netBalance).toFixed(2)} you owe
                    </span>
                  </>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {balances.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-muted-foreground font-medium">
                  All settled up!
                </p>
                <p className="text-sm text-muted-foreground">
                  No outstanding balances
                </p>
              </div>
            ) : (
              <>
                {balances.map((balance, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 ring-2 ring-background">
                        <AvatarFallback className="text-xs font-medium">
                          {balance.name === 'You'
                            ? currentUser?.full_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : balance.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{balance.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {balance.type === 'owed' ? 'Owes you' : 'You owe'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`font-bold text-sm ${
                          balance.type === 'owed'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {balance.type === 'owed' ? '+' : '-'}$
                        {balance.amount.toFixed(2)}
                      </div>
                      {balance.type === 'owed' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions - Mobile Optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {currentUser?.household_id && (
              <AddExpenseButton
                className="w-full justify-between h-11 text-sm"
                onExpenseAdded={onExpenseAdded}
                onAddExpense={onAddExpense}
              />
            )}

            <Link href="/payments" className="block">
              <Button
                className="w-full justify-between h-11 text-sm bg-transparent hover:bg-muted"
                variant="outline"
              >
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-3" />
                  Settle Payments
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/expenses/receipts" className="block">
              <Button
                className="w-full justify-between h-11 text-sm bg-transparent hover:bg-muted"
                variant="outline"
              >
                <div className="flex items-center">
                  <Receipt className="h-4 w-4 mr-3" />
                  View Receipts
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
