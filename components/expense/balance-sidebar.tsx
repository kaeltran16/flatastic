import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Profile } from '@/lib/supabase/schema.alias';
import { Balance } from '@/lib/supabase/types';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import UserAvatar from '../user-avatar';

interface BalancesSidebarProps {
  balances: Balance[];
  yourBalances: Balance[];
  yourNetBalance: number;
  currentUser: Profile | null;
  onAddExpense: (expenseData: ExpenseFormData) => Promise<void>;
}

export default function BalancesSidebar({
  balances,
  yourBalances,
  yourNetBalance,
  currentUser,
  onAddExpense,
}: BalancesSidebarProps) {
  const getBalanceDisplay = (balance: Balance) => {
    const isYouOwing = balance.fromUser.id === currentUser?.id;
    const otherUserName = isYouOwing
      ? balance.toUser.full_name
      : balance.fromUser.full_name;
    const otherUserId = isYouOwing ? balance.toUser.id : balance.fromUser.id;

    return {
      name: otherUserName,
      userId: otherUserId,
      type: isYouOwing ? ('owes' as const) : ('owed' as const),
      amount: balance.amount,
      relatedSplits: balance.related_splits.length,
    };
  };

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
              {yourBalances.length > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {yourBalances.length}
                </Badge>
              )}
            </CardTitle>
            {Math.abs(yourNetBalance) > 0.01 && (
              <CardDescription className="flex items-center gap-2">
                {yourNetBalance > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Net: +${Math.abs(yourNetBalance).toFixed(2)} owed to you
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      Net: -${Math.abs(yourNetBalance).toFixed(2)} you owe
                    </span>
                  </>
                )}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {yourBalances.length === 0 ? (
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
                {yourBalances.map((balance, index) => {
                  const display = getBalanceDisplay(balance);

                  return (
                    <motion.div
                      key={`${balance.fromUser.id}-${balance.toUser.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <UserAvatar
                          user={currentUser || undefined}
                          shouldShowName={false}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{display.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {display.type === 'owed' ? 'Owes you' : 'You owe'}
                            {display.relatedSplits > 0 &&
                              ` • ${display.relatedSplits} expense${
                                display.relatedSplits !== 1 ? 's' : ''
                              }`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className={`font-bold text-sm ${
                            display.type === 'owed'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {display.type === 'owed' ? '+' : '-'}$
                          {display.amount.toFixed(2)}
                        </div>
                        {display.type === 'owed' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions - Mobile Optimized */}
      {/* <motion.div
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
                  {yourBalances.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {yourBalances.length}
                    </Badge>
                  )}
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
      </motion.div> */}

      {/* Household Overview */}
      {/* {balances.length > yourBalances.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Household Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total balances:</span>
                  <span className="font-medium">{balances.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Your involvement:
                  </span>
                  <span className="font-medium">{yourBalances.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Others:</span>
                  <span className="font-medium">
                    {balances.length - yourBalances.length}
                  </span>
                </div>
              </div>

              <Link href="/payments" className="block mt-3">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View all household balances
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div> */}
      {/* )} */}
    </div>
  );
}
