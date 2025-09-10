// lib/hooks/use-chores.ts
'use client';

import {
  createChore,
  deleteChore,
  markChoreComplete,
  updateChore,
} from '@/lib/actions/chore';
import { createClient } from '@/lib/supabase/client';
import {
  ChoreInsert,
  ChoreStatus,
  ChoreWithProfile,
} from '@/lib/supabase/schema.alias';
import { TZDate } from '@date-fns/tz';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProfile } from './use-profile';
// Types
export type ChoreFormData = Omit<ChoreInsert, 'created_by'>;

// Query keys
export const choreKeys = {
  all: ['chores'] as const,
  lists: () => [...choreKeys.all, 'list'] as const,
  list: (householdId: string) => [...choreKeys.lists(), householdId] as const,
  details: () => [...choreKeys.all, 'detail'] as const,
  detail: (id: string) => [...choreKeys.details(), id] as const,
  profiles: ['profiles'] as const,
  household: ['household'] as const,
};

// Query function to fetch chores
// Simplified and improved fetchChores function
async function fetchChores(
  householdId: string,
  limit?: number
): Promise<ChoreWithProfile[]> {
  const supabase = createClient();

  const choreQuery = supabase
    .from('chores')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (limit) {
    choreQuery.limit(limit);
  }

  // Get chores and profiles in parallel for better performance
  const [choreResponse, profileResponse] = await Promise.all([
    choreQuery,
    supabase.from('profiles').select('*').eq('household_id', householdId),
  ]);

  if (choreResponse.error) {
    throw new Error(`Failed to load chores: ${choreResponse.error.message}`);
  }

  if (profileResponse.error) {
    throw new Error(
      `Failed to load profiles: ${profileResponse.error.message}`
    );
  }

  // Create profile lookup map for O(1) access
  const profileMap = new Map(
    profileResponse.data?.map((profile) => [profile.id, profile]) ?? []
  );

  const now = new Date();

  const timezone =
    profileMap.get(choreResponse.data?.[0]?.created_by)?.timezone ||
    'Asia/Ho_Chi_Minh';

  // Transform and enrich chores with profile data and status updates
  return (choreResponse.data ?? [])
    .map((chore): ChoreWithProfile => {
      // Calculate dynamic status for overdue chores
      let status: ChoreStatus = chore.status as ChoreStatus;
      if (status === 'pending' && chore.due_date) {
        const dueDate = new Date(chore.due_date);
        if (dueDate < now) {
          status = 'overdue';
        }
      }

      return {
        ...chore,
        status,
        // Use consistent naming - choose either assignee or assigned_user
        assignee: chore.assigned_to
          ? profileMap.get(chore.assigned_to)
          : undefined,
        creator: profileMap.get(chore.created_by)!,
      };
    })
    .sort((a, b) => {
      // Sort: incomplete chores first, then by due date
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status !== 'completed') return 1;

      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return (
        TZDate.tz(timezone, a.due_date).getTime() -
        TZDate.tz(timezone, b.due_date).getTime()
      );
      // return a.due_date.localeCompare(b.due_date);
    });
}

export function useCurrentUserChores(limit?: number) {
  const { profile: currentUser } = useProfile();

  return useQuery({
    queryKey: choreKeys.list(currentUser?.household_id || ''),
    queryFn: () => {
      if (!currentUser?.household_id) {
        throw new Error('No household found for current user');
      }
      return fetchChores(currentUser.household_id, limit);
    },
    enabled: !!currentUser?.household_id,
    staleTime: 1 * 60 * 1000,
  });
}

// Fetch chores for household
export function useChores(householdId?: string, limit?: number) {
  return useQuery({
    queryKey: choreKeys.list(householdId || ''),
    queryFn: () => {
      if (!householdId) {
        throw new Error('Household ID is required');
      }
      return fetchChores(householdId, limit);
    },
    enabled: !!householdId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Create chore mutation
export function useCreateChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: ChoreFormData) => {
      console.log('formData', formData);
      const result = await createChore(formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      const householdId = variables.household_id;
      queryClient.invalidateQueries({ queryKey: choreKeys.list(householdId) });
      toast.success('Chore created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create chore');
    },
  });
}

// Update chore mutation
export function useUpdateChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      choreId,
      formData,
    }: {
      choreId: string;
      formData: ChoreFormData;
    }) => {
      const result = await updateChore(choreId, formData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate all chore queries for this household
      queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      toast.success('Chore updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update chore');
    },
  });
}

// Delete chore mutation
export function useDeleteChore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (choreId: string) => {
      const result = await deleteChore(choreId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      toast.success('Chore deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete chore');
    },
  });
}

// Mark chore complete mutation
export function useMarkChoreComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (choreId: string) => {
      const result = await markChoreComplete(choreId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: choreKeys.lists() });
      toast.success('Chore marked as complete');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark chore complete');
    },
  });
}
