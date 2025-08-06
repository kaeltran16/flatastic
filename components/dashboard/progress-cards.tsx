'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { HouseholdStats } from '@/lib/actions/household';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface ProgressCardsProps {
  stats: HouseholdStats;
}

const ProgressCards = ({ stats }: ProgressCardsProps) => {
  const [animatedChoreProgress, setAnimatedChoreProgress] = useState(0);
  const [animatedUserProgress, setAnimatedUserProgress] = useState(0);

  const hasProgress =
    stats.choreProgress.total > 0 || stats.userProgress.total > 0;

  const choreProgressValue =
    stats.choreProgress.total > 0
      ? (stats.choreProgress.completed / stats.choreProgress.total) * 100
      : 0;

  const userProgressValue =
    stats.userProgress.total > 0
      ? (stats.userProgress.completed / stats.userProgress.total) * 100
      : 0;

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setAnimatedChoreProgress(choreProgressValue);
    }, 400);

    const timer2 = setTimeout(() => {
      setAnimatedUserProgress(userProgressValue);
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [choreProgressValue, userProgressValue]);

  if (!hasProgress) return null;

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 12,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.25,
        ease: 'easeOut' as const,
        delay: 0.1,
      },
    },
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card className="overflow-hidden">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <CardTitle>This Week's Progress</CardTitle>
          </motion.div>
        </CardHeader>
        <CardContent>
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {stats.choreProgress.total > 0 && (
                <motion.div key="chore-progress" variants={itemVariants} layout>
                  <motion.div
                    className="flex justify-between text-sm mb-3"
                    variants={statsVariants}
                  >
                    <span className="font-medium">Chores Completed</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.2 }}
                      className="font-semibold text-primary"
                    >
                      {stats.choreProgress.completed}/
                      {stats.choreProgress.total}
                    </motion.span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <Progress
                      value={animatedChoreProgress}
                      className="h-3 transition-all duration-700 ease-out"
                    />
                  </motion.div>
                </motion.div>
              )}
              {stats.userProgress.total > 0 && (
                <motion.div key="user-progress" variants={itemVariants} layout>
                  <motion.div
                    className="flex justify-between text-sm mb-3"
                    variants={statsVariants}
                  >
                    <span className="font-medium">Your Contribution</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.2 }}
                      className="font-semibold text-primary"
                    >
                      {stats.userProgress.completed}/{stats.userProgress.total}
                    </motion.span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <Progress
                      value={animatedUserProgress}
                      className="h-3 transition-all duration-700 ease-out"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProgressCards;
