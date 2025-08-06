'use server';

import { createClient } from '../supabase/server';

export interface HouseholdStats {
  pendingChores: number;
  overdueChores: number;
  balance: number;
  householdMembers: number;
  monthlyExpenses: number;
  choreProgress: { completed: number; total: number };
  userProgress: { completed: number; total: number };
}

export async function getHouseholdStats(): Promise<HouseholdStats> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      pendingChores: 0,
      overdueChores: 0,
      balance: 0,
      householdMembers: 1,
      monthlyExpenses: 0,
      choreProgress: { completed: 0, total: 0 },
      userProgress: { completed: 0, total: 0 },
    };
  }

  // Get user's household ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single();

  if (!profile?.household_id) {
    return {
      pendingChores: 0,
      overdueChores: 0,
      balance: 0,
      householdMembers: 1,
      monthlyExpenses: 0,
      choreProgress: { completed: 0, total: 0 },
      userProgress: { completed: 0, total: 0 },
    };
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

  // Calculate balance (simplified)
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
    completed: recentChores.filter((c) => c.status === 'completed').length,
    total: recentChores.length,
  };

  const userChores = recentChores.filter((c) => c.assigned_to === user.id);
  const userProgress = {
    completed: userChores.filter((c) => c.status === 'completed').length,
    total: userChores.length,
  };

  return {
    pendingChores,
    overdueChores,
    balance,
    householdMembers: members?.length || 1,
    monthlyExpenses,
    choreProgress,
    userProgress,
  };
}
