import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './admin-dashboard-client';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // get user's household id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.household_id) {
    redirect('/household');
  }

  return <AdminDashboardClient householdId={profile.household_id} />;
}
