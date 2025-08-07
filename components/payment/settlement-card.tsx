import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Settlement } from '@/types/payment';
import { getInitials } from '@/utils';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SettlementCardProps {
  settlement: Settlement;
  index?: number; // For staggered animations
}

const SettlementCard = ({ settlement, index = 0 }: SettlementCardProps) => {
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
        delay: index * 0.05, // Stagger based on index
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

  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: {
      x: '100%',
      transition: {
        duration: 1.5,
        ease: 'easeInOut' as const,
        repeat: Infinity,
        repeatDelay: 3,
      },
    },
  };

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
          border border-gray-200 hover:border-gray-300
          bg-gradient-to-br from-white to-gray-50/50
          overflow-hidden
          relative
        "
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
          </div>

          <CardContent className="p-4 sm:p-6 relative">
            {/* Mobile-first responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Main content area */}
              <div className="flex-1 min-w-0">
                {' '}
                {/* min-w-0 prevents flex item overflow */}
                {/* Avatar section */}
                <motion.div
                  className="flex items-center gap-2 sm:gap-3 mb-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                >
                  <motion.div variants={avatarVariants}>
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-white shadow-sm">
                      <AvatarFallback className="text-xs sm:text-sm font-medium">
                        {getInitials(settlement.from_user_name)}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <motion.div variants={arrowVariants}>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>

                  <motion.div variants={avatarVariants}>
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-white shadow-sm">
                      <AvatarFallback className="text-xs sm:text-sm font-medium">
                        {getInitials(settlement.to_user_name)}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                </motion.div>
                {/* Text content */}
                <div className="space-y-2">
                  <motion.div
                    className="flex flex-wrap items-center gap-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                  >
                    <span className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">
                      <span className="text-blue-600">
                        {settlement.from_user_name}
                      </span>
                      <span className="text-gray-500 mx-1">paid</span>
                      <span className="text-green-600">
                        {settlement.to_user_name}
                      </span>
                    </span>

                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <motion.div variants={badgeVariants}>
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 hover:bg-green-200 text-xs px-2 py-1"
                        >
                          completed
                        </Badge>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.p
                    className="text-sm text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.3 }}
                  >
                    {settlement.description}
                  </motion.p>

                  <motion.p
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 + 0.4 }}
                  >
                    Completed on{' '}
                    {new Date(settlement.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </motion.p>
                </div>
              </div>

              {/* Amount section - responsive positioning */}
              <motion.div
                className="flex-shrink-0 self-start sm:self-center"
                variants={amountVariants}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.2 }}
              >
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">
                    ${settlement.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                    Payment amount
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Success indicator line */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{
                delay: index * 0.05 + 0.5,
                duration: 0.6,
                ease: 'easeInOut',
              }}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default SettlementCard;
