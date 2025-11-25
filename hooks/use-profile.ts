import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

async function fetchProfile() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    // Only throw error for actual auth errors, not missing sessions
    if (userError.message !== 'Auth session missing!') {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    return null; // No user session
  }

  if (!user) {
    return null; // No authenticated user
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'User',
          avatar_url: user.user_metadata?.avatar_url,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }

      return newProfile;
    } else {
      throw new Error(`Failed to load profile: ${error.message}`);
    }
  }

  return data;
}

export function useProfile() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const query = useQuery({
    queryKey: ['profile'], // User-specific caching handled by auth state
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes - profile rarely changes
    gcTime: 10 * 60 * 1000, // Keep in cache longer
    retry: (failureCount, error: any) => {
      // Don't retry auth errors
      if (error?.message?.includes('Authentication error')) {
        return false;
      }
      return failureCount < 1; // Reduced from 3 to 1 for faster failure
    },
  });

  // Set up auth state change listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Invalidate and refetch profile
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else if (event === 'SIGNED_OUT') {
        // Clear profile data
        queryClient.setQueryData(['profile'], null);
        // Also clear household members since they depend on profile
        queryClient.invalidateQueries({ queryKey: ['household-members'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    // Expose additional TanStack Query states if needed
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}
