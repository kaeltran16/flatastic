'use client';

import { SettlementDialog } from '@/components/payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import UserAvatar from '@/components/user-avatar';
import { Balance } from '@/lib/supabase/types';
import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface BalancesSummaryProps {
  balances: Balance[];
  currentUserId: string | undefined;
  selectedBalanceUserId?: string | null;
  onBalanceSelect?: (userId: string | null) => void;
}

export function BalancesSummary({ 
  balances, 
  currentUserId, 
  selectedBalanceUserId,
  onBalanceSelect 
}: BalancesSummaryProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);

  // Filter balances involving current user
  const userBalances = balances.filter(
    (balance) =>
      balance.fromUser.id === currentUserId || balance.toUser.id === currentUserId
  );

  if (userBalances.length === 0) {
    return null;
  }

  const handleSettle = (e: React.MouseEvent, balance: Balance) => {
    e.stopPropagation();
    setSelectedBalance(balance);
    setDialogOpen(true);
  };

  const handleSettlePayment = async (
    _balance: Balance,
    _amount: number,
    _note: string
  ) => {
    setSelectedBalance(null);
  };

  const handleRowClick = (balance: Balance) => {
    const isYouOwe = balance.fromUser.id === currentUserId;
    const otherPersonId = isYouOwe ? balance.toUser.id : balance.fromUser.id;
    
    if (selectedBalanceUserId === otherPersonId) {
      onBalanceSelect?.(null); // Clear filter if clicking same person
    } else {
      onBalanceSelect?.(otherPersonId);
    }
  };

  // Calculate totals
  const totalOwed = userBalances
    .filter((b) => b.toUser.id === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);
  const totalOwing = userBalances
    .filter((b) => b.fromUser.id === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Summary Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Outstanding Balances</span>
                <span className="text-[10px] text-muted-foreground">Tap to filter expenses</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {totalOwed > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    +${totalOwed.toFixed(2)}
                  </span>
                )}
                {totalOwing > 0 && (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    -${totalOwing.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Balance List */}
            <div className="divide-y divide-border">
              <AnimatePresence>
                {userBalances.map((balance, index) => {
                  const isYouOwe = balance.fromUser.id === currentUserId;
                  const otherPerson = isYouOwe ? balance.toUser : balance.fromUser;
                  const isSelected = selectedBalanceUserId === otherPerson.id;

                  return (
                    <motion.div
                      key={`${balance.fromUser.id}-${balance.toUser.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleRowClick(balance)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10' 
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Left: Avatar + Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <UserAvatar
                            user={otherPerson}
                            className={`h-10 w-10 ${isSelected ? 'ring-2 ring-primary' : ''}`}
                            shouldShowName={false}
                          />
                          {/* Direction indicator */}
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                              isYouOwe
                                ? 'bg-rose-100 dark:bg-rose-500/20'
                                : 'bg-emerald-100 dark:bg-emerald-500/20'
                            }`}
                          >
                            {isYouOwe ? (
                              <ArrowUpRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm">
                            {otherPerson.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isYouOwe ? 'You owe' : 'Owes you'} • {balance.related_splits.length} expense{balance.related_splits.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right: Amount + Action */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-bold tabular-nums ${
                            isYouOwe
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isYouOwe ? '-' : '+'}${balance.amount.toFixed(2)}
                        </span>

                        {isYouOwe && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs gap-1.5"
                              onClick={(e) => handleSettle(e, balance)}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settlement Dialog */}
      <SettlementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedBalance={selectedBalance}
        currentUserId={currentUserId}
        onSettle={handleSettlePayment}
      />
    </>
  );
}
