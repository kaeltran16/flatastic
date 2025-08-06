'use server';

import { createClient } from '@/lib/supabase/server';
import type { ExpenseWithProfile } from '@/lib/supabase/types';

export async function getExpenses(): Promise<ExpenseWithProfile[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

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

  // Fallback to separate queries if joins not available
  if (error && error.message.includes('relationship')) {
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (expenseError) {
      throw new Error(`Failed to load expenses: ${expenseError.message}`);
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (profileError) {
      throw new Error(`Failed to load profiles: ${profileError.message}`);
    }

    const profileMap = new Map(
      profiles?.map((profile) => [profile.id, profile]) || []
    );

    data = expenseData?.map((expense) => ({
      ...expense,
      payer: profileMap.get(expense.paid_by),
    }));
  } else if (error) {
    throw new Error(`Failed to load expenses: ${error.message}`);
  }

  return (
    data?.map((expense) => ({
      ...expense,
      payer_name: expense.payer?.full_name || 'Unknown',
    })) || []
  );
}
