import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Balance } from '@/types/payment';
import { getInitials } from '@/utils';
import {
  ArrowUpRight,
  Bell,
  Clock,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface BalanceCardProps {
  balance: Balance;
  currentUserId: string | undefined;
  onSettle: (balance: Balance) => void;
  variant?: 'net' | 'individual' | 'all';
  showSettled?: boolean;
  index?: number; // For staggered animations
}

const BalanceCard = ({
  balance,
  currentUserId,
  onSettle,
  variant = 'net',
  showSettled = false,
  index = 0,
}: BalanceCardProps) => {
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
          "
          >
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-transparent opacity-0"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                {/* Avatar and relationship section */}
                <div className="flex items-center justify-between sm:justify-start flex-1">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <motion.div variants={avatarVariants}>
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-xs sm:text-sm font-medium">
                          {getInitials(balance.from_user_name)}
                        </AvatarFallback>
                      </Avatar>
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
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-xs sm:text-sm font-medium">
                          {getInitials(balance.to_user_name)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  </div>

                  {/* Amount - shown on right for mobile */}
                  <div className="text-center sm:hidden">
                    <motion.div
                      className="text-lg font-bold text-red-600"
                      variants={amountVariants}
                    >
                      ${balance.amount.toFixed(2)}
                    </motion.div>
                  </div>
                </div>

                {/* Desktop amount and expense info */}
                <div className="hidden sm:block text-center">
                  <motion.div
                    className="text-lg sm:text-xl font-bold text-red-600"
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

                {/* Names and button section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <motion.div
                    className="text-sm sm:text-base text-center sm:text-left"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <span className="font-medium text-red-600">
                      {balance.from_user_id === currentUserId
                        ? 'You'
                        : balance.from_user_name}
                    </span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="font-medium text-green-600">
                      {balance.to_user_id === currentUserId
                        ? 'You'
                        : balance.to_user_name}
                    </span>
                  </motion.div>

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
                </div>

                {/* Mobile expense info */}
                <motion.div
                  className="text-center text-xs text-muted-foreground sm:hidden"
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
          "
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Avatar and info section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <motion.div variants={avatarVariants}>
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-sm font-medium">
                          {getInitials(balance.from_user_name)}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    <motion.div variants={arrowVariants}>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>

                    <motion.div variants={avatarVariants}>
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="text-sm font-medium">
                          {getInitials(balance.to_user_name)}
                        </AvatarFallback>
                      </Avatar>
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
                          {balance.from_user_name}
                        </span>
                        <span className="text-muted-foreground mx-1">owes</span>
                        <span className="text-green-600">
                          {balance.to_user_name}
                        </span>
                      </span>

                      <motion.div variants={iconVariants}>
                        <Clock className="h-4 w-4 text-orange-600" />
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

                {/* Amount and buttons section */}
                <div className="text-center lg:text-right">
                  <motion.div
                    className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
                    variants={amountVariants}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                  >
                    ${balance.amount.toFixed(2)}
                  </motion.div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center lg:justify-end">
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto h-9 text-sm"
                      >
                        <motion.div variants={iconVariants}>
                          <Bell className="h-4 w-4 mr-2" />
                        </motion.div>
                        Remind
                      </Button>
                    </motion.div>

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
                  </div>
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
      className="space-y-3 sm:space-y-4"
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
              "
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    {/* Avatar and content section */}
                    <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.div variants={avatarVariants}>
                          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(balance.from_user_name)}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>

                        <motion.div variants={arrowVariants}>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </motion.div>

                        <motion.div variants={avatarVariants}>
                          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(balance.to_user_name)}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <motion.div
                          className="flex flex-wrap items-center gap-2 mb-1"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: splitIndex * 0.05 + 0.1 }}
                        >
                          <span className="font-medium text-sm sm:text-base">
                            <span className="text-red-600">
                              {balance.from_user_id === currentUserId
                                ? 'You'
                                : balance.from_user_name}
                            </span>
                            <span className="text-muted-foreground mx-1">
                              owes
                            </span>
                            <span className="text-green-600">
                              {balance.to_user_id === currentUserId
                                ? 'you'
                                : balance.to_user_name}
                            </span>
                          </span>

                          <motion.div variants={iconVariants}>
                            <Clock className="h-3 w-3 text-orange-600" />
                          </motion.div>
                        </motion.div>

                        {split?.expenses && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: splitIndex * 0.05 + 0.2 }}
                          >
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {split.expenses.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {split.expenses.category && (
                                <motion.div variants={badgeVariants}>
                                  <Badge variant="outline" className="text-xs">
                                    {split.expenses.category}
                                  </Badge>
                                </motion.div>
                              )}
                              <span>
                                {new Date(
                                  split.expenses.date
                                ).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span className="font-medium">
                                Total: ${split.expenses.amount.toFixed(2)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Amount and buttons section */}
                    <div className="text-center sm:text-right flex-shrink-0">
                      <motion.div
                        className="text-lg sm:text-xl font-bold text-red-600 mb-2"
                        variants={amountVariants}
                      >
                        ${split.amount_owed.toFixed(2)}
                      </motion.div>

                      <div className="flex gap-2 justify-center sm:justify-end">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2"
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Remind
                          </Button>
                        </motion.div>

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
                      </div>
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
