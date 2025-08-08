'use client';

import { Household } from '@/lib/supabase/schema.alias';
import { HouseholdInviteData } from '@/lib/supabase/types';
import { motion } from 'motion/react';
import { InviteMemberDialog } from './invite-member-dialog';

interface HouseholdNavigationProps {
  household: Household | null;
  onInvite: (data: HouseholdInviteData) => Promise<void>;
}

export function HouseholdNavigation({
  household,
  onInvite,
}: HouseholdNavigationProps) {
  return (
    <motion.nav
      className="bg-card/80 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 "
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end h-14 sm:h-16 items-center">
          <InviteMemberDialog household={household} onInvite={onInvite} />
        </div>
      </div>
    </motion.nav>
  );
}
