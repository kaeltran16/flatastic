import { createClient } from '@/lib/supabase/client';
import { Household } from '@/lib/supabase/schema.alias';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Fix: Move supabase client creation outside or create query keys properly
const householdKeys = {
  all: () => ['households'] as const,
  household: (id: string | undefined) => [...householdKeys.all(), id] as const,
  members: (id: string | undefined) =>
    [...householdKeys.household(id), 'members'] as const,
};

async function fetchHousehold(householdId: string): Promise<Household> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();

  if (error) {
    // Better error handling
    if (error.code === 'PGRST116') {
      throw new Error('Household not found');
    }
    throw new Error(error.message || 'Failed to load household');
  }

  return data;
}

export function useHousehold(
  householdId?: string | null,
  options: Partial<UseQueryOptions<Household, Error>> = {}
) {
  const query = useQuery({
    // Fix: Include householdId in query key for proper caching
    queryKey: householdKeys.household(householdId ?? undefined),
    queryFn: () => {
      if (!householdId?.trim()) {
        throw new Error('No household ID provided');
      }
      return fetchHousehold(householdId);
    },
    enabled: !!householdId?.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes - household info changes less frequently
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry if household not found
      if (error.message.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    ...options,
  });

  return {
    household: query.data,
    loading: query.isLoading,
    error: query.error,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    // Helper methods
    exists: !!query.data && !query.error,
    notFound: query.error?.message.includes('not found'),
  } as const;
}
