'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Balance } from '@/lib/supabase/types';
import { ArrowRight, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import UserAvatar from '../user-avatar';

interface ActiveBalancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balances: Balance[];
  currentUserId?: string;
}

export default function ActiveBalancesDialog({
  open,
  onOpenChange,
  balances,
  currentUserId,
}: ActiveBalancesDialogProps) {
  // Helper function to determine balance display
  const getBalanceDisplay = (balance: Balance) => {
    const isYouOwing = balance.fromUser.id === currentUserId;
    const isYouOwed = balance.toUser.id === currentUserId;

    if (isYouOwing) {
      return {
        fromUser: balance.fromUser,
        toUser: balance.toUser,
        type: 'you_owe' as const,
        amount: balance.amount,
        relatedSplits: balance.related_splits.length,
      };
    } else if (isYouOwed) {
      return {
        fromUser: balance.fromUser,
        toUser: balance.toUser,
        type: 'owed_to_you' as const,
        amount: balance.amount,
        relatedSplits: balance.related_splits.length,
      };
    }

    // This shouldn't happen if balances are filtered correctly
    return {
      fromUser: balance.fromUser,
      toUser: balance.toUser,
      type: 'other' as const,
      amount: balance.amount,
      relatedSplits: balance.related_splits.length,
    };
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            Active Balances
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {balances.length === 0
              ? 'No active balances'
              : `You have ${balances.length} active balance${balances.length !== 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-4"
        >
          {balances.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-8 sm:py-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-5xl sm:text-6xl mb-3 sm:mb-4"
              >
                🎉
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base sm:text-lg font-medium text-muted-foreground mb-2"
              >
                All settled up!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xs sm:text-sm text-muted-foreground px-4"
              >
                No outstanding balances between you and other members
              </motion.p>
            </motion.div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <AnimatePresence>
                {balances.map((balance, index) => {
                  const display = getBalanceDisplay(balance);

                  return (
                    <motion.div
                      key={`${balance.fromUser.id}-${balance.toUser.id}-${index}`}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                        display.type === 'owed_to_you'
                          ? 'bg-green-500/10 border-green-500/20 dark:bg-green-400/10 dark:border-green-400/20 hover:bg-green-500/15 dark:hover:bg-green-400/15 hover:border-green-500/30 dark:hover:border-green-400/30'
                          : display.type === 'you_owe'
                            ? 'bg-red-500/10 border-red-500/20 dark:bg-red-400/10 dark:border-red-400/20 hover:bg-red-500/15 dark:hover:bg-red-400/15 hover:border-red-500/30 dark:hover:border-red-400/30'
                            : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        {/* Left side: Avatars and relationship */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: 'spring', stiffness: 400 }}
                            >
                              <UserAvatar
                                user={display.fromUser}
                                className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-background shadow-sm"
                                shouldShowName={false}
                                showAsYou={display.fromUser.id === currentUserId}
                              />
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 + 0.1 }}
                              className="hidden sm:block"
                            >
                              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ type: 'spring', stiffness: 400 }}
                            >
                              <UserAvatar
                                user={display.toUser}
                                className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-background shadow-sm"
                                shouldShowName={false}
                                showAsYou={display.toUser.id === currentUserId}
                              />
                            </motion.div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.15 }}
                              className="font-semibold text-sm sm:text-base truncate leading-tight"
                            >
                              {display.type === 'you_owe' ? (
                                <>
                                  <span className="text-red-600 dark:text-red-400">You</span>
                                  <span className="text-muted-foreground mx-1">
                                    owe
                                  </span>
                                  <span className="text-foreground">
                                    {display.toUser.full_name}
                                  </span>
                                </>
                              ) : display.type === 'owed_to_you' ? (
                                <>
                                  <span className="text-foreground">
                                    {display.fromUser.full_name}
                                  </span>
                                  <span className="text-muted-foreground mx-1">
                                    owes
                                  </span>
                                  <span className="text-green-600 dark:text-green-400">you</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-foreground">
                                    {display.fromUser.full_name}
                                  </span>
                                  <span className="text-muted-foreground mx-1">
                                    owes
                                  </span>
                                  <span className="text-foreground">
                                    {display.toUser.full_name}
                                  </span>
                                </>
                              )}
                            </motion.p>
                            {display.relatedSplits > 0 && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 + 0.2 }}
                                className="text-xs text-muted-foreground mt-0.5 sm:mt-1"
                              >
                                From {display.relatedSplits} expense
                                {display.relatedSplits !== 1 ? 's' : ''}
                              </motion.p>
                            )}
                          </div>
                        </div>

                        {/* Right side: Amount and icon */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: index * 0.05 + 0.15,
                              type: 'spring',
                            }}
                            className={`text-lg sm:text-xl font-bold ${
                              display.type === 'owed_to_you'
                                ? 'text-green-600 dark:text-green-400'
                                : display.type === 'you_owe'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-foreground'
                            }`}
                          >
                            {display.type === 'owed_to_you' ? '+' : ''}$
                            {display.amount.toFixed(2)}
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            transition={{
                              delay: index * 0.05 + 0.2,
                              type: 'spring',
                            }}
                            className="flex-shrink-0"
                          >
                            {display.type === 'owed_to_you' ? (
                              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                            ) : display.type === 'you_owe' ? (
                              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

