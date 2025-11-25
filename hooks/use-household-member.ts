import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/schema.alias';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Make the fetch function more robust
async function fetchHouseholdMembers(
  householdId: string | null
): Promise<Profile[]> {
  if (!householdId?.trim()) {
    return [];
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load household members');
  }

  return data || [];
}

// Enhanced hook with more options and better return type
export function useHouseholdMembers(
  householdId?: string | null,
  options: Partial<UseQueryOptions<Profile[], Error>> = {}
) {
  const query = useQuery({
    queryKey: ['household-members', householdId],
    queryFn: () => fetchHouseholdMembers(householdId ?? null),
    enabled: !!householdId?.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes - members rarely change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message === 'PGRST301') {
        return false;
      }
      return failureCount < 1; // Reduced from 3 to 1 for faster failure
    },
    ...options, // Allow overriding defaults
  });

  return {
    members: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    isEmpty: query.data?.length === 0,
    isRefetching: query.isRefetching,
    isStale: query.isStale,
    refetch: query.refetch,
    invalidate: () => query.refetch(),
  } as const;
}
