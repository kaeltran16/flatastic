// export interface Profile {
//   id: string;
//   email: string;
//   full_name: string;
//   avatar_url?: string;
//   household_id?: string;
//   created_at: string;
//   updated_at: string;
// }

import { Chore, Expense, ExpenseSplit, Profile } from './schema.alias';

// export interface Household {
//   id: string;
//   name: string;
//   created_by: string;
//   created_at: string;
//   updated_at: string;
//   member_count: number;
//   invite_code?: string;
//   admin_id: string;
// }

// export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'none';

// export interface Chore {
//   id: string;
//   household_id: string;
//   name: string;
//   description?: string;
//   assigned_to?: string;
//   created_by: string;
//   due_date?: string;
//   status: 'pending' | 'completed' | 'overdue';
//   recurring_type?: RecurringType;
//   recurring_interval?: number;
//   created_at: string;
//   updated_at: string;
// }

export interface ChoreWithProfiles extends Chore {
  assignee?: Profile;
  creator?: Profile;
  assignee_name: string;
  assignee_email: string;
  creator_name: string;
  creator_email: string;
}

export interface ExpenseWithDetails extends Expense {
  payer_name: string;
  splits: ExpenseSplit[];
  your_share: number;
  status: 'pending' | 'settled';
}

// export interface Balance {
//   name: string;
//   amount: number;
//   type: 'owed' | 'owes';
// }

export interface ExpenseSplitWithExpense extends ExpenseSplit {
  expense: Expense;
}

export interface Balance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
  related_splits: ExpenseSplitWithExpense[];
}

export interface Settlement {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
  description: string;
  status: 'pending' | 'completed';
  date: string;
  note?: string;
}

// export interface Expense {
//   id: string;
//   household_id: string;
//   description: string;
//   amount: number;
//   paid_by: string;
//   category?: string;
//   date: string;
//   split_type: 'equal' | 'custom';
//   created_at: string;
//   updated_at: string;
// }

export interface ExpenseWithProfile extends Expense {
  payer?: Profile;
  payer_name: string;
}

// export interface ExpenseSplit {
//   id: string;
//   expense_id: string;
//   user_id: string;
//   expenses: Expense;
//   amount_owed: number;
//   is_settled: boolean;
//   created_at: string;
// }

// export interface Notification {
//   id: string;
//   household_id: string;
//   user_id: string;
//   type: 'chore' | 'payment' | 'general';
//   title: string;
//   message: string;
//   is_urgent: boolean;
//   is_read: boolean;
//   created_at: string;
// }

export interface HouseholdInviteData {
  email: string;
  message: string;
}
