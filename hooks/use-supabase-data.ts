// hooks/useSupabaseData.ts
import { createClient } from '@/lib/supabase/client';
import {
  ChoreWithProfiles,
  ExpenseWithProfile,
  type Notification,
  type Profile,
} from '@/lib/supabase/types';
import { useEffect, useState } from 'react';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          // Only set error for actual auth errors, not missing sessions
          if (userError.message !== 'Auth session missing!') {
            setError(`Authentication error: ${userError.message}`);
          }
          return;
        }

        if (!user) {
          // Don't set error for no user - just let profile remain null
          // This will trigger redirect logic in components
          return;
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
              setError(`Failed to create profile: ${createError.message}`);
            } else {
              setProfile(newProfile);
            }
          } else {
            setError(`Failed to load profile: ${error.message}`);
          }
        } else {
          setProfile(data);
        }
      } catch (error: any) {
        setError(`Unexpected error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    getProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        getProfile();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { profile, loading, error };
}

// =====================================================
// CHORES HOOK WITH POSTREST JOINS
// =====================================================

export function useChores() {
  const [chores, setChores] = useState<ChoreWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getChores() {
      try {
        setLoading(true);
        setError(null);

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
          .order('created_at', { ascending: false });

        // If the join syntax fails, fall back to separate queries
        if (error && error.message.includes('relationship')) {
          console.log(
            'PostgREST joins not available, using separate queries...'
          );

          // Get chores first
          const { data: choreData, error: choreError } = await supabase
            .from('chores')
            .select('*')
            .order('created_at', { ascending: false });

          if (choreError) throw choreError;

          // Get all profiles for mapping
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email');

          if (profileError) throw profileError;

          // Create lookup map
          const profileMap = new Map();
          profiles?.forEach((profile) => {
            profileMap.set(profile.id, profile);
          });

          // Combine data
          data = choreData?.map((chore) => ({
            ...chore,
            assignee: profileMap.get(chore.assigned_to),
            creator: profileMap.get(chore.created_by),
          }));

          error = null;
        }

        if (error) {
          console.error('Chores query error:', error);
          setError(error.message);
          return;
        }

        // Transform the data to flatten the nested objects
        const transformedData: ChoreWithProfiles[] =
          data?.map((chore) => ({
            ...chore,
            assignee_name: chore.assignee?.full_name || 'Unassigned',
            assignee_email: chore.assignee?.email || '',
            creator_name: chore.creator?.full_name || 'Unknown',
            creator_email: chore.creator?.email || '',
          })) || [];

        setChores(transformedData);
      } catch (error: any) {
        console.error('Error loading chores:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    getChores();
  }, [supabase]);

  return { chores, loading, error };
}

// =====================================================
// EXPENSES HOOK WITH POSTREST JOINS
// =====================================================

export function useExpenses() {
  const [expenses, setExpenses] = useState<ExpenseWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getExpenses() {
      try {
        setLoading(true);
        setError(null);

        // Try PostgREST join syntax first
        let { data, error } = await supabase
          .from('expenses')
          .select(
            `
            *,
            payer:profiles!paid_by(full_name, email)
          `
          )
          .order('date', { ascending: false });

        // If the join syntax fails, fall back to separate queries
        if (error && error.message.includes('relationship')) {
          console.log(
            'PostgREST joins not available for expenses, using separate queries...'
          );

          // Get expenses first
          const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false });

          if (expenseError) throw expenseError;

          // Get all profiles for mapping
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email');

          if (profileError) throw profileError;

          // Create lookup map
          const profileMap = new Map();
          profiles?.forEach((profile) => {
            profileMap.set(profile.id, profile);
          });

          // Combine data
          data = expenseData?.map((expense) => ({
            ...expense,
            payer: profileMap.get(expense.paid_by),
          }));

          error = null;
        }

        if (error) {
          console.error('Expenses query error:', error);
          setError(error.message);
          return;
        }

        // Transform the data to flatten the nested objects
        const transformedData: ExpenseWithProfile[] =
          data?.map((expense) => ({
            ...expense,
            payer_name: expense.payer?.full_name || 'Unknown',
          })) || [];

        setExpenses(transformedData);
      } catch (error: any) {
        console.error('Error loading expenses:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    getExpenses();
  }, [supabase]);

  return { expenses, loading, error };
}

// =====================================================
// NOTIFICATIONS HOOK
// =====================================================

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getNotifications() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Notifications query error:', error);
          setError(error.message);
          return;
        }

        setNotifications(data || []);
      } catch (error: any) {
        console.error('Error loading notifications:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    getNotifications();
  }, [supabase]);

  return { notifications, loading, error };
}

// =====================================================
// HOUSEHOLD STATS HOOK
// =====================================================

export function useHouseholdStats() {
  const [stats, setStats] = useState({
    pendingChores: 0,
    overdueChores: 0,
    balance: 0,
    householdMembers: 0,
    monthlyExpenses: 0,
    choreProgress: { completed: 0, total: 0 },
    userProgress: { completed: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getStats() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Get user's household ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('household_id')
          .eq('id', user.id)
          .single();

        if (!profile?.household_id) {
          setStats({
            pendingChores: 0,
            overdueChores: 0,
            balance: 0,
            householdMembers: 1,
            monthlyExpenses: 0,
            choreProgress: { completed: 0, total: 0 },
            userProgress: { completed: 0, total: 0 },
          });
          return;
        }

        // Get all stats in parallel
        const [
          { data: chores },
          { data: expenses },
          { data: splits },
          { data: members },
        ] = await Promise.all([
          supabase
            .from('chores')
            .select('*')
            .eq('household_id', profile.household_id),

          supabase
            .from('expenses')
            .select('*')
            .eq('household_id', profile.household_id)
            .gte(
              'date',
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ).toISOString()
            ),

          supabase.from('expense_splits').select('*').eq('user_id', user.id),

          supabase
            .from('profiles')
            .select('id')
            .eq('household_id', profile.household_id),
        ]);

        // Calculate stats
        const pendingChores =
          chores?.filter((c) => c.status === 'pending').length || 0;
        const overdueChores =
          chores?.filter(
            (c) =>
              c.status === 'pending' &&
              c.due_date &&
              new Date(c.due_date) < new Date()
          ).length || 0;

        const monthlyExpenses =
          expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        // Calculate balance (simplified - amount owed to user minus amount user owes)
        const userOwes =
          splits
            ?.filter((s) => !s.is_settled)
            .reduce((sum, s) => sum + Number(s.amount_owed), 0) || 0;
        const othersOwe =
          expenses
            ?.filter((e) => e.paid_by === user.id)
            .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const balance = othersOwe - userOwes;

        // Calculate chore progress (this week)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentChores =
          chores?.filter((c) => new Date(c.created_at) >= weekAgo) || [];
        const choreProgress = {
          completed: recentChores.filter((c) => c.status === 'completed')
            .length,
          total: recentChores.length,
        };

        const userChores = recentChores.filter(
          (c) => c.assigned_to === user.id
        );
        const userProgress = {
          completed: userChores.filter((c) => c.status === 'completed').length,
          total: userChores.length,
        };

        setStats({
          pendingChores,
          overdueChores,
          balance,
          householdMembers: members?.length || 1,
          monthlyExpenses,
          choreProgress,
          userProgress,
        });
      } catch (error: any) {
        console.error('Error loading stats:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    getStats();
  }, [supabase]);

  return { stats, loading, error };
}
