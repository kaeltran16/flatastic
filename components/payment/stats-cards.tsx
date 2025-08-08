import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Balance } from '@/lib/supabase/types';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface StatsCardsProps {
  totalOwed: number;
  totalOwing: number;
  balances: Balance[];
  currentUserId: string | undefined;
  completedCount: number;
}

// Custom hook for counting animation
const useCountUp = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const StatsCards = ({
  totalOwed,
  totalOwing,
  balances,
  currentUserId,
  completedCount,
}: StatsCardsProps) => {
  const pendingCount = balances.length;

  // Count of unique people involved
  const peopleOwingYou = balances.filter(
    (b) => b.to_user_id === currentUserId
  ).length;
  const peopleYouOwe = balances.filter(
    (b) => b.from_user_id === currentUserId
  ).length;

  // Count-up animations for numbers
  const animatedTotalOwed = useCountUp(totalOwed * 100) / 100; // For decimal precision
  const animatedTotalOwing = useCountUp(totalOwing * 100) / 100;
  const animatedPendingCount = useCountUp(pendingCount);
  const animatedCompletedCount = useCountUp(completedCount);

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
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
        duration: 0.6,
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
      scale: 1.03,
      y: -4,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const iconVariants = {
    rest: {
      scale: 1,
      rotate: 0,
    },
    hover: {
      scale: 1.1,
      rotate: [0, -5, 5, 0],
      transition: {
        duration: 0.4,
        ease: 'easeInOut' as const,
      },
    },
  };

  const statsData = [
    {
      title: "You're Owed",
      value: `$${animatedTotalOwed.toFixed(2)}`,
      subtitle:
        peopleOwingYou > 0
          ? `From ${peopleOwingYou} ${
              peopleOwingYou === 1 ? 'person' : 'people'
            }`
          : 'No money owed to you',
      icon: ArrowDownLeft,
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'hover:border-green-200',
    },
    {
      title: 'You Owe',
      value: `$${animatedTotalOwing.toFixed(2)}`,
      subtitle:
        peopleYouOwe > 0
          ? `To ${peopleYouOwe} ${peopleYouOwe === 1 ? 'person' : 'people'}`
          : 'No outstanding debts',
      icon: ArrowUpRight,
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
      bgGradient: 'from-red-50 to-rose-50',
      borderColor: 'hover:border-red-200',
    },
    {
      title: 'Pending',
      value: animatedPendingCount.toString(),
      subtitle:
        pendingCount === 1 ? 'Settlement waiting' : 'Settlements waiting',
      icon: Clock,
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      bgGradient: 'from-orange-50 to-amber-50',
      borderColor: 'hover:border-orange-200',
    },
    {
      title: 'This Month',
      value: animatedCompletedCount.toString(),
      subtitle:
        completedCount === 1 ? 'Completed payment' : 'Completed payments',
      icon: CheckCircle2,
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'hover:border-blue-200',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.title}
          variants={cardVariants}
          whileHover="hover"
          initial="rest"
          className="relative"
        >
          <motion.div variants={hoverVariants}>
            <Card
              className={`
              cursor-pointer transition-all duration-300 
              hover:shadow-lg hover:shadow-black/10
              bg-gradient-to-br ${stat.bgGradient}
              border-2 border-transparent ${stat.borderColor}
              h-full min-h-[120px] sm:min-h-[140px]
            `}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base font-medium text-gray-700">
                  {stat.title}
                </CardTitle>
                <motion.div variants={iconVariants}>
                  <stat.icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`}
                  />
                </motion.div>
              </CardHeader>
              <CardContent className="pt-1">
                <motion.div
                  className={`text-2xl sm:text-3xl font-bold ${stat.valueColor} mb-1`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                >
                  {stat.value}
                </motion.div>
                <motion.p
                  className="text-xs sm:text-sm text-gray-600"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.4, duration: 0.4 }}
                >
                  {stat.subtitle}
                </motion.p>
              </CardContent>

              {/* Animated background gradient overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-lg opacity-0"
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Subtle shine effect on hover */}
              <motion.div
                className="absolute top-0 left-0 w-full h-full rounded-lg overflow-hidden"
                initial={false}
              >
                <motion.div
                  className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  whileHover={{
                    left: '100%',
                    transition: { duration: 0.6, ease: 'easeInOut' },
                  }}
                />
              </motion.div>
            </Card>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsCards;
