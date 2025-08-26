// lib/hooks/use-chores.ts
'use client';

import {
  createChoreAction,
  deleteChoreAction,
  markChoreCompleteAction,
  updateChoreAction,
} from '@/lib/actions/chore';
import { createClient } from '@/lib/supabase/client';
import {
  ChoreStatus,
  ChoreWithProfile,
  Household,
  Profile,
  RecurringType,
} from '@/lib/supabase/schema.alias';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// Types

export type ChoreFormData = {
  name: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  recurring_type: RecurringType;
  recurring_interval: number | null;
  status: ChoreStatus;
  household_id: string;
};

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

// Fetch current user and household
export function useCurrentUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('No authenticated user');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      return profile as Profile;
    },
    retry: 1,
  });
}

// Fetch household
export function useHousehold(householdId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: choreKeys.household,
    queryFn: async () => {
      if (!householdId) throw new Error('No household ID provided');

      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();

      if (error) throw error;
      return data as Household;
    },
    enabled: !!householdId,
  });
}

// Fetch household members
export function useHouseholdMembers(householdId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: [...choreKeys.profiles, householdId],
    queryFn: async () => {
      if (!householdId) throw new Error('No household ID provided');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', householdId);

      if (error) throw error;
      return (data || []) as Profile[];
    },
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch chores for household
export function useChores(householdId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: choreKeys.list(householdId || ''),
    queryFn: async () => {
      if (!householdId) throw new Error('No household ID provided');

      // Try PostgREST join syntax first
      let { data, error } = await supabase
        .from('chores')
        .select(
          `
          *,
          assignee:profiles!assigned_to(full_name, email),
          creator:profiles!created_by(full_name, email)
        `
        )
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

      // Fallback to separate queries if joins not available
      if (error && error.message.includes('relationship')) {
        const { data: choreData, error: choreError } = await supabase
          .from('chores')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        if (choreError) throw choreError;

        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('household_id', householdId);

        if (profileError) throw profileError;

        const profileMap = new Map(
          profiles?.map((profile) => [profile.id, profile]) || []
        );

        data = choreData?.map((chore) => ({
          ...chore,
          assignee: chore.assigned_to
            ? profileMap.get(chore.assigned_to)
            : null,
          creator: chore.created_by ? profileMap.get(chore.created_by) : null,
        }));
      } else if (error) {
        throw error;
      }

      // Update overdue status and format response
      const now = new Date();
      const formattedChores = (data || []).map((chore): ChoreWithProfile => {
        let status = chore.status;
        if (status === 'pending' && chore.due_date) {
          const dueDate = new Date(chore.due_date);
          if (dueDate < now) {
            status = 'overdue';
          }
        }

        return {
          ...chore,
          status,
          assignee_name: chore.assignee?.full_name || 'Unassigned',
          assignee_email: chore.assignee?.email || '',
          creator_name: chore.creator?.full_name || 'Unknown',
          creator_email: chore.creator?.email || '',
        };
      });

      return formattedChores;
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
      const result = await createChoreAction(formData);
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
      const result = await updateChoreAction(choreId, formData);
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
      const result = await deleteChoreAction(choreId);
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
      const result = await markChoreCompleteAction(choreId);
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
