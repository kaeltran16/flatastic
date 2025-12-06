import ActiveBalancesDialog from '@/components/expense/active-balances-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Profile } from '@/lib/supabase/schema.alias';
import { Balance } from '@/lib/supabase/types';
import {
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import UserAvatar from '../user-avatar';

interface PaymentSidebarProps {
  userBalances: Balance[];
  householdMembers?: Profile[];
  currentUserId?: string;
  onRecordPayment: () => void;
}

// Custom hook for counting animation
const useCountUp = (end: number, duration: number = 1200) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setCount(end * easeOutCubic);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure we end at exact value
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const PaymentSidebar = ({
  userBalances,
  householdMembers,
  currentUserId,
  onRecordPayment,
}: PaymentSidebarProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalOwed = userBalances
    .filter((b) => b.toUser.id === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);

  const totalYouOwe = userBalances
    .filter((b) => b.fromUser.id === currentUserId)
    .reduce((sum, b) => sum + b.amount, 0);

  const netBalance = totalOwed - totalYouOwe;

  // Animated values
  const animatedTotalOwed = useCountUp(totalOwed * 100) / 100;
  const animatedTotalYouOwe = useCountUp(totalYouOwe * 100) / 100;
  const animatedNetBalance = useCountUp(netBalance * 100) / 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
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

  const buttonVariants = {
    rest: {
      scale: 1,
      backgroundColor: 'rgba(0,0,0,0)',
    },
    hover: {
      scale: 1.02,
      backgroundColor: 'rgba(0,0,0,0.02)',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25,
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
      },
    },
  };

  const iconVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.1,
      rotate: [0, -5, 5, 0],
      transition: {
        duration: 0.4,
      },
    },
  };

  const memberVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const avatarVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.1,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  };

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Quick Actions */}
      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
          <CardHeader className="pb-3 sm:pb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-base sm:text-lg">
                Quick Actions
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                className="w-full justify-start bg-transparent hover:bg-gray-50 h-11 sm:h-10 text-sm sm:text-base transition-all duration-200"
                variant="outline"
                disabled={userBalances.length === 0}
                onClick={onRecordPayment}
              >
                <motion.div variants={iconVariants}>
                  <DollarSign className="h-4 w-4 mr-2 sm:mr-3" />
                </motion.div>
                Record Payment
                {userBalances.length === 0 && (
                  <motion.div
                    className="ml-auto w-2 h-2 bg-gray-400 rounded-full"
                    variants={pulseVariants}
                    animate="animate"
                  />
                )}
              </Button>
            </motion.div>

            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                className="w-full justify-start bg-transparent hover:bg-gray-50 h-11 sm:h-10 text-sm sm:text-base transition-all duration-200"
                variant="outline"
              >
                <motion.div variants={iconVariants}>
                  <CheckCircle2 className="h-4 w-4 mr-2 sm:mr-3" />
                </motion.div>
                Send Reminder
              </Button>
            </motion.div>

            <Link href="/expenses" className="block">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  className="w-full justify-start bg-transparent hover:bg-gray-50 h-11 sm:h-10 text-sm sm:text-base transition-all duration-200"
                  variant="outline"
                >
                  <motion.div variants={iconVariants}>
                    <ArrowUpRight className="h-4 w-4 mr-2 sm:mr-3" />
                  </motion.div>
                  View Expenses
                </Button>
              </motion.div>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settlement Summary */}
      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="pb-3 sm:pb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Settlement Summary
                {netBalance !== 0 && (
                  <motion.div variants={pulseVariants} animate="animate">
                    {netBalance > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </motion.div>
                )}
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <motion.div
              className="flex justify-between items-center cursor-pointer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setIsDialogOpen(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-muted-foreground text-sm sm:text-base">
                Net Balance
                {userBalances.length > 0 && (
                  <span className="ml-1 sm:ml-2 text-xs hidden sm:inline">(Click to view)</span>
                )}
              </span>
              <motion.span
                className={`font-bold text-lg sm:text-xl ${
                  animatedNetBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
                key={animatedNetBalance} // Re-trigger animation on value change
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {animatedNetBalance >= 0 ? '+' : ''}$
                {animatedNetBalance.toFixed(2)}
              </motion.span>
            </motion.div>

            <motion.div
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-muted-foreground text-sm sm:text-base">
                Pending In
              </span>
              <motion.span
                className="font-semibold text-green-600 text-base sm:text-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                ${animatedTotalOwed.toFixed(2)}
              </motion.span>
            </motion.div>

            <motion.div
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <span className="text-muted-foreground text-sm sm:text-base">
                Pending Out
              </span>
              <motion.span
                className="font-semibold text-red-600 text-base sm:text-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
              >
                ${animatedTotalYouOwe.toFixed(2)}
              </motion.span>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Household Members */}
      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300 bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="pb-3 sm:pb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CardTitle className="text-base sm:text-lg">
                Household Members
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                People in your household ({householdMembers?.length || 0})
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {householdMembers?.map((member, index) => (
                <motion.div
                  key={member.id}
                  variants={memberVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ delay: index * 0.1 }}
                  whileHover="hover"
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <motion.div variants={avatarVariants}>
                    <UserAvatar
                      user={member}
                      className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm"
                      shouldShowName={false}
                      showAsYou={member.id === currentUserId}
                    />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <motion.p
                      className="text-sm sm:text-base font-medium truncate"
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.1 }}
                    >
                      {member.id === currentUserId ? (
                        <span className="text-blue-600 font-semibold">You</span>
                      ) : (
                        member.full_name
                      )}
                    </motion.p>
                    <motion.p
                      className="text-xs sm:text-sm text-muted-foreground truncate"
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {member.email}
                    </motion.p>
                  </div>

                  {member.id === currentUserId && (
                    <motion.div
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      variants={pulseVariants}
                      animate="animate"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Balances Dialog */}
      <ActiveBalancesDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        balances={userBalances}
        currentUserId={currentUserId}
      />
    </motion.div>
  );
};

export default PaymentSidebar;
