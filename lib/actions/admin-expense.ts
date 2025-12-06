'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Return type for server actions
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BalanceSummary {
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserName: string;
  toUserEmail: string;
  amount: number;
}

interface UnsettledExpenseSummary {
  totalUnsettled: number;
  unsettledCount: number;
  balances: BalanceSummary[];
}

/**
 * Get summary of all unsettled expenses for a household
 */
export async function getUnsettledExpensesSummary(
  householdId: string
): Promise<ActionResult<UnsettledExpenseSummary>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user is admin
    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', householdId)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Get all unsettled expense splits with expense and user info
    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .select(`
        *,
        expenses!inner(
          id,
          description,
          amount,
          paid_by,
          household_id,
          date,
          category
        )
      `)
      .eq('expenses.household_id', householdId)
      .eq('is_settled', false);

    if (splitsError) {
      return { success: false, error: splitsError.message };
    }

    // Get all household members
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('household_id', householdId);

    const memberMap = new Map(
      members?.map((m) => [m.id, { name: m.full_name || m.email, email: m.email }]) || []
    );

    // Calculate balances between users
    const pairBalances = new Map<string, number>();

    splits?.forEach((split) => {
      const payerId = split.expenses.paid_by;
      const debtorId = split.user_id;

      if (payerId === debtorId) return;

      const pairKey = `${debtorId}-${payerId}`;
      const currentAmount = pairBalances.get(pairKey) || 0;
      pairBalances.set(pairKey, currentAmount + split.amount_owed);
    });

    // Calculate net balances
    const netBalances: BalanceSummary[] = [];
    const processedPairs = new Set<string>();

    pairBalances.forEach((amount, key) => {
      const [fromId, toId] = key.split('-');
      const reverseKey = `${toId}-${fromId}`;
      const sortedKey = [fromId, toId].sort().join('-');

      if (processedPairs.has(sortedKey)) return;
      processedPairs.add(sortedKey);

      const reverseAmount = pairBalances.get(reverseKey) || 0;
      const netAmount = amount - reverseAmount;

      if (Math.abs(netAmount) > 0.01) {
        const from = netAmount > 0 ? fromId : toId;
        const to = netAmount > 0 ? toId : fromId;
        const fromInfo = memberMap.get(from);
        const toInfo = memberMap.get(to);

        if (fromInfo && toInfo) {
          netBalances.push({
            fromUserId: from,
            fromUserName: fromInfo.name,
            fromUserEmail: fromInfo.email,
            toUserId: to,
            toUserName: toInfo.name,
            toUserEmail: toInfo.email,
            amount: Math.abs(netAmount),
          });
        }
      }
    });

    const totalUnsettled = netBalances.reduce((sum, b) => sum + b.amount, 0);

    return {
      success: true,
      data: {
        totalUnsettled,
        unsettledCount: splits?.length || 0,
        balances: netBalances,
      },
    };
  } catch (error) {
    console.error('Error getting unsettled expenses summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send settlement reminders to all users with outstanding balances
 */
export async function sendSettlementReminders(
  householdId: string
): Promise<ActionResult<{ notificationsSent: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user is admin
    const { data: household } = await supabase
      .from('households')
      .select('admin_id, name')
      .eq('id', householdId)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Get unsettled balances
    const summaryResult = await getUnsettledExpensesSummary(householdId);
    if (!summaryResult.success || !summaryResult.data) {
      return { success: false, error: 'Failed to get balance summary' };
    }

    const { balances } = summaryResult.data;

    // Get unique users who owe money
    const usersWhoOwe = new Map<string, number>();
    balances.forEach((balance) => {
      const current = usersWhoOwe.get(balance.fromUserId) || 0;
      usersWhoOwe.set(balance.fromUserId, current + balance.amount);
    });

    // Create notifications for each user
    let notificationsSent = 0;
    for (const [userId, amount] of usersWhoOwe) {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        household_id: householdId,
        title: 'Settlement Reminder',
        message: `You have outstanding balances of $${amount.toFixed(2)} to settle. Please review your expenses.`,
        type: 'payment_due',
        is_read: false,
        is_urgent: amount > 50,
      });

      if (!error) {
        notificationsSent++;
      }
    }

    revalidatePath('/admin/recurring-chores');

    return {
      success: true,
      data: { notificationsSent },
    };
  } catch (error) {
    console.error('Error sending settlement reminders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk settle multiple expense splits for a user
 */
export async function bulkSettleExpenses(
  splitIds: string[]
): Promise<ActionResult<{ settledCount: number }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's household and check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (!profile?.household_id) {
      return { success: false, error: 'User not in a household' };
    }

    const { data: household } = await supabase
      .from('households')
      .select('admin_id')
      .eq('id', profile.household_id)
      .single();

    if (household?.admin_id !== user.id) {
      return { success: false, error: 'Admin access required' };
    }

    // Update all splits to settled
    const { error: updateError, data } = await supabase
      .from('expense_splits')
      .update({ is_settled: true })
      .in('id', splitIds)
      .select();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/expenses');
    revalidatePath('/admin/recurring-chores');

    return {
      success: true,
      data: { settledCount: data?.length || 0 },
    };
  } catch (error) {
    console.error('Error bulk settling expenses:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get expense audit log - all recent expense activity
 */
export async function getExpenseAuditLog(
  householdId: string,
  limit: number = 50
): Promise<
  ActionResult<
    Array<{
      id: string;
      description: string;
      amount: number;
      paidByName: string;
      category: string;
      date: string;
      createdAt: string;
      splitCount: number;
      settledCount: number;
    }>
  >
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get expenses with splits
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        profiles!expenses_paid_by_fkey(full_name, email),
        expense_splits(id, is_settled)
      `)
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    const auditLog = expenses?.map((expense) => {
      const payerProfile = Array.isArray(expense.profiles) ? expense.profiles[0] : expense.profiles;
      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        paidByName: payerProfile?.full_name || payerProfile?.email || 'Unknown',
        category: expense.category || 'other',
        date: expense.date,
        createdAt: expense.created_at || new Date().toISOString(),
        splitCount: expense.expense_splits?.length || 0,
        settledCount: expense.expense_splits?.filter((s: any) => s.is_settled).length || 0,
      };
    });

    return {
      success: true,
      data: auditLog || [],
    };
  } catch (error) {
    console.error('Error getting expense audit log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
