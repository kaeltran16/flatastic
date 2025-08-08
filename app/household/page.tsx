'use client';

import {
  pageVariants,
  staggerContainer,
} from '@/components/household/animations';
import { NoHouseholdDisplay } from '@/components/household/empty-state';
import { ErrorDisplay } from '@/components/household/error';
import { HouseholdHeader } from '@/components/household/header';
import { HouseholdInfo } from '@/components/household/info';
import { InviteMemberDialog } from '@/components/household/invite-member-dialog';
import { LoadingSpinner } from '@/components/household/loading';
import { MembersList } from '@/components/household/member-list';
import { HouseholdSidebar } from '@/components/household/sidebar';
import {
  useHousehold,
  useHouseholdMembers,
  useProfile,
} from '@/hooks/use-supabase-data';
import { HouseholdInviteData } from '@/lib/supabase/types';
import { motion } from 'motion/react';

export default function HouseholdPage() {
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useProfile();

  const {
    household,
    loading: householdLoading,
    error: householdError,
  } = useHousehold(profile?.household_id || null);

  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useHouseholdMembers(profile?.household_id || null);

  const loading = profileLoading || householdLoading || membersLoading;
  const error = profileError || householdError || membersError;

  const handleInviteMember = async (data: HouseholdInviteData) => {
    // TODO: Implement invite functionality
    console.log('Inviting member:', data);
  };

  const handleRemoveMember = async (memberId: string) => {
    // TODO: Implement remove member functionality
    console.log('Removing member:', memberId);
  };

  if (loading) {
    return <LoadingSpinner message="Loading household..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!profile?.household_id) {
    return <NoHouseholdDisplay />;
  }

  if (!household) {
    return <ErrorDisplay error="Household not found" />;
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-4">
        <HouseholdHeader />
        <div className="flex justify-end mb-4">
          <InviteMemberDialog
            household={household}
            onInvite={handleInviteMember}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <motion.div
            className="lg:col-span-2 space-y-4 sm:space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <HouseholdInfo household={household} />
            <MembersList
              members={members}
              currentUserId={profile.id}
              household={household}
              onRemoveMember={handleRemoveMember}
            />
          </motion.div>

          {/* Sidebar */}
          <HouseholdSidebar members={members} household={household} />
        </div>
      </div>
    </motion.div>
  );
}
