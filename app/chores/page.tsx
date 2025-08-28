// app/chores/page.tsx
'use client';

import { motion } from 'motion/react';
import { useMemo, useState } from 'react';

// Components
import ChoreDialog from '@/components/chore/chore-dialog';
import ErrorState from '@/components/chore/error';
import ChoreFilters from '@/components/chore/filters';
import SetupRequiredState from '@/components/chore/requirements';
import ChoreStatsCards from '@/components/chore/stats-card';
import ChoreTabs from '@/components/chore/tabs';
import { LoadingSpinner } from '@/components/household/loading';

// Hooks and utilities
import {
  ChoreFormData,
  useChores,
  useCreateChore,
  useCurrentUser,
  useDeleteChore,
  useHouseholdMembers,
  useMarkChoreComplete,
  useUpdateChore,
} from '@/hooks/use-chore';
import { useHousehold } from '@/hooks/use-household';
import { ChoreFilters as ChoreFiltersType } from '@/lib/validations/chore';

export default function ChoresPage() {
  // Filters state
  const [filters, setFilters] = useState<ChoreFiltersType>({
    assigneeFilter: 'all',
    statusFilter: 'all',
    recurringFilter: 'all',
  });

  // Data fetching
  const {
    data: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser();
  const {
    household,
    loading: householdLoading,
    error: householdError,
  } = useHousehold(currentUser?.household_id);
  const { data: householdMembers = [], isLoading: membersLoading } =
    useHouseholdMembers(currentUser?.household_id ?? undefined);
  const {
    data: chores = [],
    isLoading: choresLoading,
    error: choresError,
  } = useChores(currentUser?.household_id ?? undefined);

  // Mutations
  const createChoreMutation = useCreateChore();
  const updateChoreMutation = useUpdateChore();
  const deleteChoreMutation = useDeleteChore();
  const markCompleteMutation = useMarkChoreComplete();

  // Computed values
  const isLoading =
    userLoading || householdLoading || membersLoading || choresLoading;
  const error = userError || householdError || choresError;

  // Filter chores based on current filters
  const filteredChores = useMemo(() => {
    return chores.filter((chore) => {
      if (
        filters.assigneeFilter !== 'all' &&
        chore.assigned_to !== filters.assigneeFilter
      )
        return false;
      if (
        filters.statusFilter !== 'all' &&
        chore.status !== filters.statusFilter
      )
        return false;
      if (filters.recurringFilter !== 'all') {
        if (
          filters.recurringFilter === 'none' &&
          chore.recurring_type &&
          chore.recurring_type !== 'none'
        )
          return false;
        if (
          filters.recurringFilter !== 'none' &&
          chore.recurring_type !== filters.recurringFilter
        )
          return false;
      }
      return true;
    });
  }, [chores, filters]);

  // Categorize filtered chores
  const choresByStatus = useMemo(() => {
    return {
      pending: filteredChores.filter((chore) => chore.status === 'pending'),
      overdue: filteredChores.filter((chore) => chore.status === 'overdue'),
      completed: filteredChores.filter((chore) => chore.status === 'completed'),
    };
  }, [filteredChores]);

  // Event handlers
  const handleFilterChange = (
    filterType: keyof ChoreFiltersType,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleNewChore = async (formData: ChoreFormData) => {
    try {
      await createChoreMutation.mutateAsync(formData);
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Failed to create chore:', error);
    }
  };

  const handleUpdateChore = async (
    choreId: string,
    formData: ChoreFormData
  ) => {
    try {
      await updateChoreMutation.mutateAsync({ choreId, formData });
    } catch (error) {
      console.error('Failed to update chore:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const handleDeleteChore = async (choreId: string) => {
    try {
      await deleteChoreMutation.mutateAsync(choreId);
    } catch (error) {
      console.error('Failed to delete chore:', error);
      throw error;
    }
  };

  const handleMarkComplete = async (choreId: string) => {
    try {
      await markCompleteMutation.mutateAsync(choreId);
    } catch (error) {
      console.error('Failed to mark chore complete:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <ErrorState error={error.message || 'An unexpected error occurred'} />
      </div>
    );
  }

  // No user or household state
  if (!currentUser || !household) {
    return (
      <div className="min-h-screen bg-background">
        <SetupRequiredState />
      </div>
    );
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

        {/* Add Chore Button */}
        <ChoreDialog
          className="w-full mb-4"
          mode="create"
          householdId={household.id}
          currentUserId={currentUser.id}
          householdMembers={householdMembers}
          onSubmit={handleNewChore}
          isLoading={createChoreMutation.isPending}
        />

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ChoreStatsCards chores={chores} />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <ChoreFilters
            householdMembers={householdMembers}
            currentUser={currentUser}
            assigneeFilter={filters.assigneeFilter}
            statusFilter={filters.statusFilter}
            recurringFilter={filters.recurringFilter}
            onAssigneeFilterChange={(value) =>
              handleFilterChange('assigneeFilter', value)
            }
            onStatusFilterChange={(value) =>
              handleFilterChange('statusFilter', value)
            }
            onRecurringFilterChange={(value) =>
              handleFilterChange('recurringFilter', value)
            }
          />
        </motion.div>

        {/* Chore Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <ChoreTabs
            filteredChores={filteredChores}
            pendingChores={choresByStatus.pending}
            overdueChores={choresByStatus.overdue}
            completedChores={choresByStatus.completed}
            household={household}
            currentUser={currentUser}
            householdMembers={householdMembers}
            onMarkComplete={handleMarkComplete}
            onChoreUpdated={(updatedChore) => {
              // This will be handled automatically by TanStack Query
              console.log('Chore updated:', updatedChore);
            }}
            onChoreDeleted={(choreId) => {
              // This will be handled automatically by TanStack Query
              console.log('Chore deleted:', choreId);
            }}
            onChoreAdded={() => {
              // This will be handled automatically by TanStack Query
              console.log('Chore added');
            }}
            onUpdateChore={handleUpdateChore}
            onDeleteChore={handleDeleteChore}
            isUpdating={updateChoreMutation.isPending}
            isDeleting={deleteChoreMutation.isPending}
            isMarkingComplete={markCompleteMutation.isPending}
          />
        </motion.div>
      </div>
    </div>
  );
}
