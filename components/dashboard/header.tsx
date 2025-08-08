'use client';

import type { Profile } from '@/lib/supabase/schema.alias';
import { motion } from 'motion/react';

interface DashboardHeaderProps {
  profile: Profile;
}

const DashboardHeader = ({ profile }: DashboardHeaderProps) => {
  // useLoadingScreen();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 16,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    },
  };

  const titleVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.div
      className="mb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="text-3xl md:text-4xl font-bold text-foreground mb-2"
        variants={titleVariants}
      >
        Welcome back, {profile.full_name?.split(' ')[0] || 'there'}!
      </motion.h1>
      <motion.p
        className="text-muted-foreground text-base md:text-lg"
        variants={itemVariants}
      >
        Here's what's happening in your household
      </motion.p>
    </motion.div>
  );
};

export default DashboardHeader;
