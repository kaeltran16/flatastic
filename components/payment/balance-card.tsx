import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Balance } from '@/lib/supabase/types';
import {
  ArrowUpRight,
  Bell,
  Clock,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import UserAvatar from '../user-avatar';

interface BalanceCardProps {
  balance: Balance;
  currentUserId: string | undefined;
  onSettle: (balance: Balance) => void;
  onRemind?: (balance: Balance) => void;
  variant?: 'net' | 'individual' | 'all';
  showSettled?: boolean;
  index?: number; // For staggered animations
}

const BalanceCard = ({
  balance,
  currentUserId,
  onSettle,
  onRemind,
  variant = 'net',
  showSettled = false,
  index = 0,
}: BalanceCardProps) => {
  // Helper functions for permission checks
  const canRemind = (balance: Balance, currentUserId: string | undefined) => {
    // Only the person who is owed money can send reminders
    return currentUserId === balance.toUser.id;
  };

  const canSettle = (balance: Balance, currentUserId: string | undefined) => {
    // Only the person who owes money can settle/pay
    return currentUserId === balance.fromUser.id;
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
        delay: index * 0.05,
      },
    },
  };

  const hoverVariants = {
    rest: {
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut' as const,
      },
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25,
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

  const buttonVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1,
      },
    },
  };

  const iconVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.1,
      rotate: [0, -10, 10, 0],
      transition: {
        duration: 0.4,
      },
    },
  };

  const arrowVariants = {
    rest: { x: 0, rotate: 0 },
    hover: {
      x: 3,
      rotate: 15,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const amountVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const badgeVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.05,
      rotate: [0, -2, 2, 0],
      transition: {
        duration: 0.4,
      },
    },
  };

  if (variant === 'net') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="relative"
      >
        <motion.div variants={hoverVariants}>
          <Card
            className="
            hover:shadow-lg hover:shadow-black/5 
            transition-all duration-300 cursor-pointer
            bg-gradient-to-br from-white to-red-50/30
            border border-red-100 hover:border-red-200
            overflow-hidden relative
            mx-2 sm:mx-0
          "
          >
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-transparent opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                {/* Avatar and relationship section */}
                <div className="flex items-center justify-between sm:justify-center flex-1">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <motion.div variants={avatarVariants}>
                      <UserAvatar
                        user={balance.fromUser}
                        className="h-7 w-7 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm"
                      />
                    </motion.div>

                    <motion.span
                      className="text-xs sm:text-sm text-muted-foreground px-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      owes
                    </motion.span>

                    <motion.div variants={avatarVariants}>
                      {/* <Avatar className="h-7 w-7 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-xs sm:text-sm font-medium">
                          {getInitials(balance.toUser.full_name)}
                        </AvatarFallback>
                      </Avatar> */}

                      <UserAvatar
                        user={balance.toUser}
                        className="h-7 w-7 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm"
                        shouldShowName={false}
                      />
                    </motion.div>
                  </div>

                  <div className="text-center sm:hidden">
                    <motion.div
                      className="text-xl font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200"
                      variants={amountVariants}
                    >
                      ${balance.amount.toFixed(2)}
                    </motion.div>
                  </div>
                </div>

                <div className="hidden sm:block text-start">
                  <motion.div
                    className="text-2xl font-extrabold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 shadow-sm mb-2"
                    variants={amountVariants}
                  >
                    ${balance.amount.toFixed(2)}
                  </motion.div>
                  <motion.div
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                  >
                    from {balance.related_splits.length} expense
                    {balance.related_splits.length !== 1 ? 's' : ''}
                  </motion.div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <motion.div
                    className="text-sm sm:text-base text-start sm:text-left"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <span className="font-medium text-red-600">
                      {balance.fromUser.id === currentUserId
                        ? 'You'
                        : balance.fromUser.full_name}
                    </span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="font-medium text-green-600">
                      {balance.toUser.id === currentUserId
                        ? 'You'
                        : balance.toUser.full_name}
                    </span>
                  </motion.div>

                  {canSettle(balance, currentUserId) && (
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        size="sm"
                        onClick={() => onSettle(balance)}
                        className="w-full sm:w-auto h-9 sm:h-8 text-sm"
                      >
                        <motion.div variants={iconVariants}>
                          <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
                        </motion.div>
                        Settle
                      </Button>
                    </motion.div>
                  )}

                  {canRemind(balance, currentUserId) && (
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemind?.(balance)}
                        className="w-full sm:w-auto h-9 sm:h-8 text-sm"
                      >
                        <motion.div variants={iconVariants}>
                          <Bell className="h-4 w-4 mr-1 sm:mr-2" />
                        </motion.div>
                        Remind
                      </Button>
                    </motion.div>
                  )}
                </div>

                <motion.div
                  className="text-start text-xs text-muted-foreground sm:hidden"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                >
                  from {balance.related_splits.length} expense
                  {balance.related_splits.length !== 1 ? 's' : ''}
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  if (variant === 'all') {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="relative"
      >
        <motion.div variants={hoverVariants}>
          <Card
            className="
            hover:shadow-lg hover:shadow-black/5 
            transition-all duration-300
            bg-gradient-to-br from-white to-orange-50/30
            border border-orange-100 hover:border-orange-200
            mx-2 sm:mx-0
          "
          >
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                {/* Avatar and info section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                  {/* Mobile layout: avatars and amount on same row */}
                  <div className="flex items-center justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                      <motion.div variants={avatarVariants}>
                        <UserAvatar
                          user={balance.fromUser}
                          className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-white shadow-sm"
                          shouldShowName={false}
                        />
                      </motion.div>

                      <motion.div variants={arrowVariants}>
                        <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      </motion.div>

                      <motion.div variants={avatarVariants}>
                        <UserAvatar
                          user={balance.toUser}
                          className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-white shadow-sm"
                          shouldShowName={false}
                        />
                      </motion.div>
                    </div>

                    {/* Mobile prominent amount */}
                    <motion.div
                      className="lg:hidden text-2xl font-extrabold text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                      variants={amountVariants}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                    >
                      ${balance.amount.toFixed(2)}
                    </motion.div>
                  </div>

                  <div className="text-center sm:text-left flex-1">
                    <motion.div
                      className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <span className="font-semibold text-sm sm:text-base">
                        <span className="text-red-600">
                          {balance.fromUser.full_name}
                        </span>
                        <span className="text-muted-foreground mx-1">owes</span>
                        <span className="text-green-600">
                          {balance.toUser.full_name}
                        </span>
                      </span>

                      <motion.div variants={iconVariants}>
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      </motion.div>

                      <motion.div variants={badgeVariants}>
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800 text-xs"
                        >
                          pending
                        </Badge>
                      </motion.div>
                    </motion.div>

                    <motion.p
                      className="text-sm text-muted-foreground"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                    >
                      {balance.related_splits.length} related expense
                      {balance.related_splits.length !== 1 ? 's' : ''}
                    </motion.p>
                  </div>
                </div>

                {/* Desktop amount and buttons section */}
                <div className="hidden lg:block text-center lg:text-right">
                  <motion.div
                    className="text-3xl font-extrabold text-gray-900 mb-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
                    variants={amountVariants}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                  >
                    ${balance.amount.toFixed(2)}
                  </motion.div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center lg:justify-end">
                    {canRemind(balance, currentUserId) && (
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemind?.(balance)}
                          className="w-full sm:w-auto h-9 text-sm"
                        >
                          <motion.div variants={iconVariants}>
                            <Bell className="h-4 w-4 mr-2" />
                          </motion.div>
                          Send Reminder
                        </Button>
                      </motion.div>
                    )}

                    {canSettle(balance, currentUserId) && (
                      <motion.div
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          size="sm"
                          onClick={() => onSettle(balance)}
                          className="w-full sm:w-auto h-9 text-sm"
                        >
                          <motion.div variants={iconVariants}>
                            <CreditCard className="h-4 w-4 mr-2" />
                          </motion.div>
                          Record Payment
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Mobile/Tablet buttons - full width */}
                <div className="flex gap-2 lg:hidden">
                  {canRemind(balance, currentUserId) && (
                    <motion.div
                      className={`${
                        canSettle(balance, currentUserId) ? 'flex-1' : 'w-full'
                      }`}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemind?.(balance)}
                        className="w-full h-9 text-sm"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Send Reminder
                      </Button>
                    </motion.div>
                  )}

                  {canSettle(balance, currentUserId) && (
                    <motion.div
                      className={`${
                        canRemind(balance, currentUserId) ? 'flex-1' : 'w-full'
                      }`}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        size="sm"
                        onClick={() => onSettle(balance)}
                        className="w-full h-9 text-sm"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // Individual expense splits
  return (
    <motion.div
      className="space-y-2 sm:space-y-3 md:space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <AnimatePresence>
        {balance.related_splits.map((split, splitIndex) => (
          <motion.div
            key={`split-${splitIndex}`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            whileHover="hover"
            transition={{ delay: splitIndex * 0.05 }}
          >
            <motion.div variants={hoverVariants}>
              <Card
                className="
                hover:shadow-lg hover:shadow-black/5 
                transition-all duration-300
                bg-gradient-to-br from-white to-blue-50/30
                border border-blue-100 hover:border-blue-200
                mx-2 sm:mx-0
              "
              >
                <CardContent className="p-3 sm:p-4 md:p-5">
                  {/* Mobile-first stacked layout */}
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
                    {/* Top section: Users and relationship */}
                    <div className="flex items-center justify-between sm:justify-start sm:flex-1 sm:min-w-0">
                      {/* Avatar section - more compact on mobile */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.div variants={avatarVariants}>
                          <UserAvatar
                            user={balance.fromUser}
                            className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-white shadow-sm"
                            shouldShowName={false}
                          />
                        </motion.div>

                        <motion.div variants={arrowVariants}>
                          <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        </motion.div>

                        <motion.div variants={avatarVariants}>
                          <UserAvatar
                            user={balance.toUser}
                            className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-white shadow-sm"
                            shouldShowName={false}
                          />
                        </motion.div>
                      </div>

                      {/* Amount - moved to top right on mobile */}
                      <motion.div
                        className="text-right sm:hidden"
                        variants={amountVariants}
                      >
                        <div className="text-xl font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                          ${split.amount_owed.toFixed(2)}
                        </div>
                      </motion.div>
                    </div>

                    {/* Content section */}
                    <div className="sm:flex-1 sm:min-w-0 sm:ml-4">
                      {/* User relationship text */}
                      <motion.div
                        className="mb-2 sm:mb-1"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: splitIndex * 0.05 + 0.1 }}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-medium text-sm sm:text-base leading-tight">
                            <span className="text-red-600">
                              {balance.fromUser.id === currentUserId
                                ? 'You'
                                : balance.fromUser.full_name}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              owes
                            </span>
                            <span className="text-green-600">
                              {balance.toUser.id === currentUserId
                                ? 'You'
                                : balance.toUser.full_name}
                            </span>
                          </span>

                          <motion.div variants={iconVariants}>
                            <Clock className="h-3 w-3 text-orange-600 flex-shrink-0" />
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Expense details */}
                      {split.expense && (
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: splitIndex * 0.05 + 0.2 }}
                        >
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {split.expense.description}
                          </p>

                          {/* Expense metadata - improved mobile layout */}
                          <div className="flex flex-col xs:flex-row xs:flex-wrap xs:items-center gap-1.5 xs:gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {split.expense.category && (
                                <motion.div variants={badgeVariants}>
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5"
                                  >
                                    {split.expense.category}
                                  </Badge>
                                </motion.div>
                              )}
                              <span className="whitespace-nowrap">
                                {new Date(
                                  split.expense.date
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 xs:ml-auto">
                              <span className="hidden xs:inline">•</span>
                              <span className="font-medium whitespace-nowrap">
                                Total: ${split.expense.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Desktop amount and buttons */}
                    <div className="hidden sm:flex sm:flex-col sm:items-end sm:flex-shrink-0 sm:text-right">
                      <motion.div
                        className="text-2xl font-extrabold text-red-600 mb-3 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 shadow-sm"
                        variants={amountVariants}
                      >
                        ${split.amount_owed.toFixed(2)}
                      </motion.div>

                      <div className="flex gap-2">
                        {canRemind(balance, currentUserId) && (
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRemind?.(balance)}
                              className="h-8 text-xs px-2"
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              Remind
                            </Button>
                          </motion.div>
                        )}

                        {canSettle(balance, currentUserId) && (
                          <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              size="sm"
                              onClick={() => onSettle(balance)}
                              className="h-8 text-xs px-2"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Mobile buttons - full width at bottom */}
                    <div className="flex gap-2 sm:hidden">
                      {canRemind(balance, currentUserId) && (
                        <motion.div
                          className={`${
                            canSettle(balance, currentUserId)
                              ? 'flex-1'
                              : 'w-full'
                          }`}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemind?.(balance)}
                            className="w-full h-9 text-sm"
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Remind
                          </Button>
                        </motion.div>
                      )}

                      {canSettle(balance, currentUserId) && (
                        <motion.div
                          className={`${
                            canRemind(balance, currentUserId)
                              ? 'flex-1'
                              : 'w-full'
                          }`}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            size="sm"
                            onClick={() => onSettle(balance)}
                            className="w-full h-9 text-sm"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default BalanceCard;
