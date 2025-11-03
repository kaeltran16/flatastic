// Updated household page component with admin availability management

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
import { AvailabilitySection } from '@/components/household/member-availability';
import { MembersList } from '@/components/household/member-list';
import { HouseholdSettings } from '@/components/household/settings';
import { HouseholdSidebar } from '@/components/household/sidebar';
import { useHousehold } from '@/hooks/use-household';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';

import {
  inviteHouseholdMember,
  leaveHousehold,
  regenerateInviteCode,
  removeHouseholdMember,
  updateHouseholdName,
} from '@/lib/actions/household';
import { HouseholdInviteData } from '@/lib/supabase/types';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function HouseholdPage() {
  const router = useRouter();

  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();

  const {
    household,
    loading: householdLoading,
    error: householdError,
    refetch: refetchHousehold,
  } = useHousehold(profile?.household_id);

  const {
    members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useHouseholdMembers(profile?.household_id || null);

  const loading = profileLoading || householdLoading || membersLoading;
  const error = profileError || householdError || membersError;

  const handleRefresh = async () => {
    // Refetch only the data that changed
    await Promise.all([
      refetchProfile?.(),
      refetchMembers?.(),
      refetchHousehold?.(),
    ]);
  };

  const handleInviteMember = async (data: HouseholdInviteData) => {
    if (!household) {
      toast.error('No household found');
      return;
    }

    try {
      await inviteHouseholdMember(household.id, data);
      toast.success(`Invitation sent to ${data.email}!`);
      await handleRefresh();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to send invitation'
      );
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!household) {
      toast.error('No household found');
      return;
    }

    const member = members?.find((m) => m.id === memberId);
    const memberName = member?.full_name || member?.email || 'Member';

    try {
      await removeHouseholdMember(household.id, memberId);
      toast.success(`${memberName} has been removed from the household`);
      await handleRefresh();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove member'
      );
    }
  };

  const handleUpdateName = async (name: string) => {
    if (!household) return;

    try {
      await updateHouseholdName(household.id, name);
      await handleRefresh();
      toast.success('Household name updated!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update name'
      );
      throw error;
    }
  };

  const handleRegenerateCode = async (): Promise<string> => {
    if (!household) throw new Error('No household found');

    try {
      const newCode = await regenerateInviteCode(household.id);
      await handleRefresh();
      toast.success('New invite code generated!');
      return newCode;
    } catch (error) {
      toast.error('Failed to regenerate invite code');
      throw error;
    }
  };

  const handleLeaveHousehold = async () => {
    try {
      await leaveHousehold();
      toast.success('You have left the household');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to leave household'
      );
      throw error;
    }
  };

  const isAdmin = profile?.id === household?.admin_id;

  if (loading) {
    return <LoadingSpinner />;
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

        {isAdmin && (
          <div className="flex justify-end mb-4">
            <InviteMemberDialog
              household={household}
              onInvite={handleInviteMember}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <motion.div
            className="lg:col-span-2 space-y-4 sm:space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <HouseholdInfo household={household} />

            {/* Enhanced Availability Section with Admin Controls */}
            <AvailabilitySection
              userId={profile.id}
              currentUserAvailability={profile.is_available ?? true}
              isAdmin={isAdmin}
              members={members || []}
              onAvailabilityChange={handleRefresh}
            />

            <MembersList
              members={members}
              currentUserId={profile.id}
              household={household}
              onRemoveMember={handleRemoveMember}
            />

            {household && (
              <HouseholdSettings
                household={household}
                currentUserId={profile.id}
                memberCount={members?.length || 0}
                onUpdateName={handleUpdateName}
                onRegenerateCode={handleRegenerateCode}
                onLeaveHousehold={handleLeaveHousehold}
              />
            )}
          </motion.div>

          {/* Sidebar */}
          <HouseholdSidebar members={members} household={household} />
        </div>
      </div>
    </motion.div>
  );
}
