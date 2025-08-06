export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  household_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  invite_code?: string;
  admin_id: string;
}

export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'none';

export interface Chore {
  id: string;
  household_id: string;
  name: string;
  description?: string;
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  recurring_type?: RecurringType;
  recurring_interval?: number;
  created_at: string;
  updated_at: string;
}

export interface ChoreWithProfiles extends Chore {
  assignee?: Profile;
  creator?: Profile;
  assignee_name: string;
  assignee_email: string;
  creator_name: string;
  creator_email: string;
}

export interface Expense {
  id: string;
  household_id: string;
  description: string;
  amount: number;
  paid_by: string;
  category?: string;
  date: string;
  split_type: 'equal' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithProfile extends Expense {
  payer?: Profile;
  payer_name: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  expenses: Expense;
  amount_owed: number;
  is_settled: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  household_id: string;
  user_id: string;
  type: 'chore' | 'payment' | 'general';
  title: string;
  message: string;
  is_urgent: boolean;
  is_read: boolean;
  created_at: string;
}
