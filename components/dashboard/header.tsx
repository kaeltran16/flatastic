'use client';

import type { Profile } from '@/lib/supabase/schema.alias';
import { motion } from 'motion/react';
import { useMemo } from 'react';

interface DashboardHeaderProps {
  profile: Profile;
}

const DashboardHeader = ({ profile }: DashboardHeaderProps) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = profile.full_name?.split(' ')[0] || 'there';

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
        {greeting}, {firstName}!
      </h1>
      <p className="text-sm md:text-base text-muted-foreground mt-1">
        Here's what's happening today
      </p>
    </motion.div>
  );
};

export default DashboardHeader;
