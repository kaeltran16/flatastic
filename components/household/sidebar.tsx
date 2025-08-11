'use client';

import { Household, Profile } from '@/lib/supabase/schema.alias';
import { motion } from 'motion/react';
import { staggerContainer } from './animations';
import { InviteCodeCard } from './invite-code-card';
import { QuickStats } from './quick-stats';

interface HouseholdSidebarProps {
  members: Profile[];
  household: Household;
}

export function HouseholdSidebar({
  members,
  household,
}: HouseholdSidebarProps) {
  return (
    <motion.div
      className="space-y-4 sm:space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <QuickStats members={members} household={household} />
      <InviteCodeCard household={household} />
      {/* <HouseholdSettings /> */}
    </motion.div>
  );
}
