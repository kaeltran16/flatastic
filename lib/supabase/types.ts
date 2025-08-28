// lib/supabase/types.ts

import {
  Chore,
  ChoreStatus,
  ChoreTemplate,
  ChoreWithProfile,
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  ExpenseWithSplits,
  FundPenalty,
  Household,
  HouseholdWithMembers,
  Notifications,
  NotificationType,
  PaymentNote,
  Profile,
  PushSubscription,
  RecurringType,
  SplitType,
} from './schema.alias';

// Re-export the alias types for consistency
export type {
  Chore,
  ChoreStatus,
  ChoreTemplate,
  ChoreWithProfile,
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  ExpenseWithSplits,
  FundPenalty,
  Household,
  HouseholdWithMembers,
  NotificationType,
  PaymentNote,
  Profile,
  PushSubscription,
  RecurringType,
  SplitType,
};

export type Notification = Notifications;

export interface ExpenseWithDetails extends Expense {
  payer: Profile;
  splits: ExpenseSplit[];
  your_share: number;
  status: 'pending' | 'settled';
}

export interface ExpenseSplitWithExpense
  extends Omit<ExpenseSplit, 'created_at'> {
  expense: Expense;
}

export interface Balance {
  fromUser: Profile;
  toUser: Profile;
  amount: number;
  related_splits: ExpenseSplitWithExpense[];
  payment_link?: string;
}

export interface Settlement {
  id: string;
  fromUser: Profile;
  toUser: Profile;
  amount: number;
  description: string;
  status: 'pending' | 'completed';
  date: string;
  note?: string;
}

export interface NotificationData {
  user_id: string;
  household_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_urgent?: boolean;
  is_read?: boolean;
}

export interface ExpenseWithProfile extends Expense {
  payer?: Profile | null;
}

export interface PendingInvitation {
  id: string;
  household_id: string;
  invited_email: string;
  invited_by: string;
  message?: string;
  expires_at: string;
  created_at: string;
}

export interface HouseholdInviteData {
  email: string;
  message: string;
}

// Form data types for actions
export interface ChoreFormData {
  name: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  recurring_type?: string | null;
  recurring_interval?: number | null;
  status?: string | null;
  household_id: string;
}

// Action result types
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
