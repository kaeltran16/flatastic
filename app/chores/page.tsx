'use client';

import { createClient } from '@/lib/supabase/client';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

// Components
import ErrorState from '@/components/chore/error';
import ChoreFilters from '@/components/chore/filters';
import SetupRequiredState from '@/components/chore/requirements';
import ChoreStatsCards from '@/components/chore/stats-card';
import ChoreTabs from '@/components/chore/tabs';

// Types
import AddChoreButton from '@/components/chore/add-chore-button';
import { LoadingSpinner } from '@/components/household/loading';
import { addChore } from '@/lib/actions/chore';
import { Chore, Household, Profile } from '@/lib/supabase/schema.alias';
import { toast } from 'sonner';

// Data structure for chore updates
export interface ChoreUpdateData {
  name: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  recurring_type?: 'daily' | 'weekly' | 'monthly' | 'none';
  recurring_interval?: number;
}

export default function ChoresPage() {
  const supabase = createClient();

  // State management
  const [chores, setChores] = useState<Chore[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [recurringFilter, setRecurringFilter] = useState<string>('all');

  // Fetch current user and their household
  useEffect(() => {
    async function fetchUserAndHousehold() {
      try {
        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No authenticated user');

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile) throw new Error('Profile not found');

        setCurrentUser(profile);

        if (!profile.household_id) {
          throw new Error('User is not part of a household');
        }

        // Get household
        const { data: householdData, error: householdError } = await supabase
          .from('households')
          .select('*')
          .eq('id', profile.household_id)
          .single();

        if (householdError) throw householdError;
        setHousehold(householdData);

        // Get household members
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('household_id', profile.household_id);

        if (membersError) throw membersError;
        setHouseholdMembers(members || []);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch user data'
        );
      }
    }

    fetchUserAndHousehold();
  }, [supabase]);

  // Fetch chores
  useEffect(() => {
    async function fetchChores() {
      if (!currentUser?.household_id) return;

      try {
        setIsLoading(true);

        const { data, error: choresError } = await supabase
          .from('chores')
          .select('*')
          .eq('household_id', currentUser.household_id)
          .order('created_at', { ascending: false });

        if (choresError) throw choresError;

        // Update overdue status
        const now = new Date();
        const updatedChores = (data || []).map((chore) => {
          if (chore.status === 'pending' && chore.due_date) {
            const dueDate = new Date(chore.due_date);
            if (dueDate < now) {
              return { ...chore, status: 'overdue' as const };
            }
          }
          return chore;
        });

        setChores(updatedChores);
      } catch (err) {
        console.error('Error fetching chores:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chores');
      } finally {
        setIsLoading(false);
      }
    }

    fetchChores();
  }, [currentUser?.household_id, supabase]);

  // Handle adding new chore
  // const handleNewChore = (newChore: Chore): void => {
  //   setChores((prev) => [newChore, ...prev]);
  // };

  // In your component
  const handleNewChore = async (choreData: Chore) => {
    // Validate input first

    try {
      const newChore = await addChore(choreData);
      setChores((prev) => [newChore, ...prev]);
      // Handle success - the UI will automatically update due to revalidatePath
      console.log('Chore added successfully:', newChore);
    } catch (error) {
      // Handle error
      console.error('Failed to add chore:', error);
    }
  };

  // Handle updating chore
  const handleUpdateChore = async (
    choreId: string,
    updateData: ChoreUpdateData
  ): Promise<void> => {
    try {
      const choreUpdateData = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('chores')
        .update(choreUpdateData)
        .eq('id', choreId)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log('Chore updated successfully:', data);

      setChores((prev) =>
        prev.map((chore) => (chore.id === choreId ? (data as Chore) : chore))
      );
    } catch (error: any) {
      console.error('Error updating chore:', error);
      throw error;
    }
  };

  // Handle deleting chore
  const handleDeleteChore = async (choreId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      console.log('Chore deleted successfully:', choreId);

      setChores((prev) => prev.filter((chore) => chore.id !== choreId));
    } catch (error: any) {
      console.error('Error deleting chore:', error);
      throw error;
    }
  };

  // Handle chore updated callback
  const handleChoreUpdated = (updatedChore: Chore): void => {
    setChores((prev) =>
      prev.map((chore) => (chore.id === updatedChore.id ? updatedChore : chore))
    );
  };

  // Handle chore deleted callback
  const handleChoreDeleted = (choreId: string): void => {
    setChores((prev) => prev.filter((chore) => chore.id !== choreId));
  };

  // Handle marking chore as complete
  const handleMarkComplete = async (choreId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('chores')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', choreId);

      if (error) throw error;

      setChores((prev) =>
        prev.map((chore) =>
          chore.id === choreId
            ? {
                ...chore,
                status: 'completed' as const,
                updated_at: new Date().toISOString(),
              }
            : chore
        )
      );
    } catch (err) {
      console.error('Error marking chore complete:', err);
      toast.error('Failed to mark chore as complete');
    }
  };

  // Filter chores
  const filteredChores = chores.filter((chore) => {
    if (assigneeFilter !== 'all' && chore.assigned_to !== assigneeFilter)
      return false;
    if (statusFilter !== 'all' && chore.status !== statusFilter) return false;
    if (recurringFilter !== 'all') {
      if (
        recurringFilter === 'none' &&
        chore.recurring_type &&
        chore.recurring_type !== 'none'
      )
        return false;
      if (
        recurringFilter !== 'none' &&
        chore.recurring_type !== recurringFilter
      )
        return false;
    }
    return true;
  });

  const pendingChores = filteredChores.filter(
    (chore) => chore.status === 'pending'
  );
  const overdueChores = filteredChores.filter(
    (chore) => chore.status === 'overdue'
  );
  const completedChores = filteredChores.filter(
    (chore) => chore.status === 'completed'
  );

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // No user or household state
  if (!currentUser || !household) {
    return <SetupRequiredState />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-4">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Household Chores
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and track all household tasks for {household.name}
          </p>
        </motion.div>
        <div className="flex justify-end mb-4">
          <AddChoreButton
            onChoreAdded={handleNewChore}
            householdId={household.id}
            currentUserId={currentUser.id}
            householdMembers={householdMembers}
          />
        </div>

        {/* Stats Cards */}
        <ChoreStatsCards chores={chores} />

        {/* Filters */}
        <ChoreFilters
          householdMembers={householdMembers}
          currentUser={currentUser}
          assigneeFilter={assigneeFilter}
          statusFilter={statusFilter}
          recurringFilter={recurringFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          onStatusFilterChange={setStatusFilter}
          onRecurringFilterChange={setRecurringFilter}
        />

        <ChoreTabs
          filteredChores={filteredChores}
          pendingChores={pendingChores}
          overdueChores={overdueChores}
          completedChores={completedChores}
          household={household}
          currentUser={currentUser}
          householdMembers={householdMembers}
          onChoreAdded={handleNewChore}
          onMarkComplete={handleMarkComplete}
          onChoreUpdated={handleChoreUpdated}
          onChoreDeleted={handleChoreDeleted}
          onUpdateChore={handleUpdateChore}
          onDeleteChore={handleDeleteChore}
        />
      </div>
    </div>
  );
}
