'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HouseholdStats } from '@/lib/actions/household';
import { Calendar, DollarSign, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface StatsCardsProps {
  stats: HouseholdStats;
}

const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
  duration = 800,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  decimals?: number;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Use easeOut for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(value * easeOut);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    const timer = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, 200); // Small delay before starting counter

    return () => {
      clearTimeout(timer);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);
  const displayValue =
    decimals > 0 ? count.toFixed(decimals) : Math.round(count);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

const StatsCards = ({ stats }: StatsCardsProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
        delay: 0.2,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-sm font-medium">
                Pending Chores
              </CardTitle>
            </motion.div>
            <motion.div variants={iconVariants}>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div variants={contentVariants}>
              <motion.div
                className="text-2xl font-bold"
                variants={itemVariants}
              >
                <AnimatedCounter value={stats.pendingChores} />
              </motion.div>
              <motion.p
                className="text-xs text-muted-foreground"
                variants={itemVariants}
              >
                <AnimatedCounter
                  value={stats.overdueChores}
                  suffix=" overdue"
                />
              </motion.p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-sm font-medium">
                Your Balance
              </CardTitle>
            </motion.div>
            <motion.div variants={iconVariants}>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div variants={contentVariants}>
              <motion.div
                className={`text-2xl font-bold ${
                  stats.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
                variants={itemVariants}
              >
                <AnimatedCounter
                  value={Math.abs(stats.balance)}
                  prefix={stats.balance >= 0 ? '+$' : '-$'}
                  decimals={2}
                />
              </motion.div>
              <motion.p
                className="text-xs text-muted-foreground"
                variants={itemVariants}
              >
                {stats.balance >= 0 ? "You're owed money" : 'You owe money'}
              </motion.p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-sm font-medium">
                Household Members
              </CardTitle>
            </motion.div>
            <motion.div variants={iconVariants}>
              <Users className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div variants={contentVariants}>
              <motion.div
                className="text-2xl font-bold"
                variants={itemVariants}
              >
                <AnimatedCounter value={stats.householdMembers} />
              </motion.div>
              <motion.p
                className="text-xs text-muted-foreground"
                variants={itemVariants}
              >
                Including you
              </motion.p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={cardVariants}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
            </motion.div>
            <motion.div variants={iconVariants}>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.div variants={contentVariants}>
              <motion.div
                className="text-2xl font-bold"
                variants={itemVariants}
              >
                <AnimatedCounter
                  value={Math.round(stats.monthlyExpenses)}
                  prefix="$"
                  duration={1000}
                />
              </motion.div>
              <motion.p
                className="text-xs text-muted-foreground"
                variants={itemVariants}
              >
                Total expenses
              </motion.p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default StatsCards;
