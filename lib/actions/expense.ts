// actions/expense-actions.ts
'use server';

import type { ExpenseFormData } from '@/hooks/use-expense';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

// Return type for server actions
interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Add expense server action
export async function addExpenseAction(formData: ExpenseFormData): Promise<
  ActionResult<{
    expense: any;
    splits: any[];
  }>
> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user's household
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.household_id) {
      return { success: false, error: 'User household not found' };
    }

    // Validate input
    if (!formData.description?.trim()) {
      return { success: false, error: 'Description is required' };
    }

    if (formData.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    // Get household members for validation
    const { data: householdMembers, error: membersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', profile.household_id);

    if (membersError || !householdMembers?.length) {
      return { success: false, error: 'Failed to load household members' };
    }

    // Validate custom splits if provided
    if (formData.split_type === 'custom') {
      if (!formData.custom_splits?.length) {
        return {
          success: false,
          error: 'Custom splits are required for custom split type',
        };
      }

      const totalSplitAmount = formData.custom_splits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      if (Math.abs(totalSplitAmount - formData.amount) > 0.01) {
        return {
          success: false,
          error: 'Split amounts must add up to the total expense amount',
        };
      }

      // Validate that all split users exist in household
      const memberIds = new Set(householdMembers.map((m) => m.id));
      const invalidUsers = formData.custom_splits.filter(
        (split) => !memberIds.has(split.user_id)
      );
      if (invalidUsers.length > 0) {
        return { success: false, error: 'Invalid users in splits' };
      }
    }

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        household_id: profile.household_id,
        description: formData.description.trim(),
        amount: formData.amount,
        paid_by: user.id,
        category: formData.category,
        date: formData.date,
        split_type: formData.split_type,
      })
      .select()
      .single();

    if (expenseError) {
      return {
        success: false,
        error: `Failed to create expense: ${expenseError.message}`,
      };
    }

    // Create splits
    let splits: any[] = [];
    if (formData.split_type === 'equal') {
      const splitAmount = formData.amount / householdMembers.length;
      splits = householdMembers.map((member) => ({
        expense_id: expense.id,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === user.id,
      }));
    } else if (formData.split_type === 'custom') {
      splits = formData.custom_splits!.map((split) => ({
        expense_id: expense.id,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === user.id,
      }));
    }

    const { data: createdSplits, error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splits)
      .select();

    if (splitsError) {
      // Rollback expense creation
      await supabase.from('expenses').delete().eq('id', expense.id);
      return {
        success: false,
        error: `Failed to create splits: ${splitsError.message}`,
      };
    }

    // Revalidate cache
    revalidateTag(`expenses-${profile.household_id}`, {});

    return {
      success: true,
      data: {
        expense,
        splits: createdSplits,
      },
    };
  } catch (error) {
    console.error('Add expense error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// Edit expense server action
export async function editExpenseAction(
  expenseId: string,
  formData: ExpenseFormData
): Promise<ActionResult<{ expense: any; splits: any[] }>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get existing expense with validation
    const { data: existingExpense, error: expenseError } = await supabase
      .from('expenses')
      .select(
        `
        *,
        expense_splits(*)
      `
      )
      .eq('id', expenseId)
      .single();

    if (expenseError || !existingExpense) {
      return { success: false, error: 'Expense not found' };
    }

    // Validation checks
    if (existingExpense.paid_by !== user.id) {
      return { success: false, error: 'Only the payer can edit this expense' };
    }

    const hasOtherSettledSplits = existingExpense.expense_splits.some(
      (split: any) => split.user_id !== user.id && split.is_settled
    );

    if (hasOtherSettledSplits) {
      return {
        success: false,
        error: 'Cannot edit expense with settled payments from others',
      };
    }

    // Get household members
    const { data: householdMembers, error: membersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('household_id', existingExpense.household_id);

    if (membersError || !householdMembers?.length) {
      return { success: false, error: 'Failed to load household members' };
    }

    // Validate custom splits if provided
    if (formData.split_type === 'custom') {
      if (!formData.custom_splits?.length) {
        return {
          success: false,
          error: 'Custom splits are required for custom split type',
        };
      }

      const totalSplitAmount = formData.custom_splits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      if (Math.abs(totalSplitAmount - formData.amount) > 0.01) {
        return {
          success: false,
          error: 'Split amounts must add up to the total expense amount',
        };
      }
    }

    // Update expense
    const { data: updatedExpense, error: updateError } = await supabase
      .from('expenses')
      .update({
        description: formData.description.trim(),
        amount: formData.amount,
        category: formData.category,
        date: formData.date,
        split_type: formData.split_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', expenseId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: `Failed to update expense: ${updateError.message}`,
      };
    }

    // Delete existing splits
    const { error: deleteSplitsError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteSplitsError) {
      return {
        success: false,
        error: `Failed to delete old splits: ${deleteSplitsError.message}`,
      };
    }

    // Create new splits
    let splits: any[] = [];
    if (formData.split_type === 'equal') {
      const splitAmount = formData.amount / householdMembers.length;
      splits = householdMembers.map((member) => ({
        expense_id: expenseId,
        user_id: member.id,
        amount_owed: splitAmount,
        is_settled: member.id === user.id,
      }));
    } else if (formData.split_type === 'custom') {
      splits = formData.custom_splits!.map((split) => ({
        expense_id: expenseId,
        user_id: split.user_id,
        amount_owed: split.amount,
        is_settled: split.user_id === user.id,
      }));
    }

    const { data: newSplits, error: newSplitsError } = await supabase
      .from('expense_splits')
      .insert(splits)
      .select();

    if (newSplitsError) {
      return {
        success: false,
        error: `Failed to create new splits: ${newSplitsError.message}`,
      };
    }

    revalidateTag(`expenses-${existingExpense.household_id}`, {});

    return {
      success: true,
      data: {
        expense: updatedExpense,
        splits: newSplits,
      },
    };
  } catch (error) {
    console.error('Edit expense error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// Delete expense server action
export async function deleteExpenseAction(
  expenseId: string
): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get expense with splits for validation
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(
        `
        *,
        expense_splits(*)
      `
      )
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return { success: false, error: 'Expense not found' };
    }

    // Validation checks
    if (expense.paid_by !== user.id) {
      return {
        success: false,
        error: 'Only the payer can delete this expense',
      };
    }

    const hasOtherSettledSplits = expense.expense_splits.some(
      (split: any) => split.user_id !== user.id && split.is_settled
    );

    if (hasOtherSettledSplits) {
      return {
        success: false,
        error: 'Cannot delete expense with settled payments from others',
      };
    }

    // Delete splits first (foreign key constraint)
    const { error: deleteSplitsError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteSplitsError) {
      return {
        success: false,
        error: `Failed to delete expense splits: ${deleteSplitsError.message}`,
      };
    }

    // Delete expense
    const { error: deleteExpenseError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteExpenseError) {
      return {
        success: false,
        error: `Failed to delete expense: ${deleteExpenseError.message}`,
      };
    }

    revalidateTag(`expenses-${expense.household_id}`, {});

    return {
      success: true,
      data: expenseId,
    };
  } catch (error) {
    console.error('Delete expense error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// Settle expense server action
export async function settleExpenseAction(expenseId: string): Promise<
  ActionResult<{
    expenseId: string;
    isPayer: boolean;
  }>
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

    // Get expense with splits
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(
        `
        *,
        expense_splits(*)
      `
      )
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return { success: false, error: 'Expense not found' };
    }

    const isPayer = expense.paid_by === user.id;

    if (isPayer) {
      // Payer settles all unsettled splits
      const unsettledSplits = expense.expense_splits.filter(
        (split: any) => !split.is_settled
      );

      if (unsettledSplits.length === 0) {
        return { success: false, error: 'All splits are already settled' };
      }

      const { error: settleError } = await supabase
        .from('expense_splits')
        .update({ is_settled: true })
        .in(
          'id',
          unsettledSplits.map((split: any) => split.id)
        );

      if (settleError) {
        return {
          success: false,
          error: `Failed to settle splits: ${settleError.message}`,
        };
      }
    } else {
      // Individual user settles their own split
      const userSplit = expense.expense_splits.find(
        (split: any) => split.user_id === user.id
      );

      if (!userSplit) {
        return { success: false, error: 'No split found for current user' };
      }

      if (userSplit.is_settled) {
        return { success: false, error: 'Your split is already settled' };
      }

      const { error: settleError } = await supabase
        .from('expense_splits')
        .update({ is_settled: true })
        .eq('id', userSplit.id);

      if (settleError) {
        return {
          success: false,
          error: `Failed to settle your split: ${settleError.message}`,
        };
      }
    }

    revalidateTag(`expenses-${expense.household_id}`, {});

    return {
      success: true,
      data: {
        expenseId,
        isPayer,
      },
    };
  } catch (error) {
    console.error('Settle expense error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
