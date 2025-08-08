'use server';

import { Profile } from '@/lib/supabase/schema.alias';
import { createClient } from '@/lib/supabase/server';

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
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
    }
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}
