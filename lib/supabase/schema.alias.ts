import { Tables, TablesInsert, TablesUpdate } from './schema.types';

export type Chore = Tables<'chores'>;
export type ExpenseSplit = Tables<'expense_splits'>;
export type Expense = Tables<'expenses'>;
export type Household = Tables<'households'>;
export type Notification = Tables<'notifications'>;
export type Profile = Tables<'profiles'>;
export type PushSubscription = Tables<'push_subscriptions'>;
export type PaymentNote = Tables<'payment_notes'>;

export type ChoreInsert = TablesInsert<'chores'>;
export type ExpenseSplitInsert = TablesInsert<'expense_splits'>;
export type ExpenseInsert = TablesInsert<'expenses'>;
export type HouseholdInsert = TablesInsert<'households'>;
export type NotificationInsert = TablesInsert<'notifications'>;
export type ProfileInsert = TablesInsert<'profiles'>;
export type PushSubscriptionInsert = TablesInsert<'push_subscriptions'>;
export type PaymentNoteInsert = TablesInsert<'payment_notes'>;

export type ChoreUpdate = TablesUpdate<'chores'>;
export type ExpenseSplitUpdate = TablesUpdate<'expense_splits'>;
export type ExpenseUpdate = TablesUpdate<'expenses'>;
export type HouseholdUpdate = TablesUpdate<'households'>;
export type NotificationUpdate = TablesUpdate<'notifications'>;
export type ProfileUpdate = TablesUpdate<'profiles'>;
export type PushSubscriptionUpdate = TablesUpdate<'push_subscriptions'>;
export type PaymentNoteUpdate = TablesUpdate<'payment_notes'>;

export type ChoreStatus = 'pending' | 'completed' | 'overdue';
export type ExpenseCategory =
  | 'groceries'
  | 'utilities'
  | 'rent'
  | 'entertainment'
  | 'other';
export type SplitType = 'equal' | 'custom' | 'percentage';
export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'none';
export type NotificationType =
  | 'chore_reminder'
  | 'expense_added'
  | 'payment_due'
  | 'system';

export type ChoreWithProfile = Chore & {
  assigned_user?: Profile;
  creator?: Profile;
};

export type ExpenseWithSplits = Expense & {
  expense_splits: (ExpenseSplit & { user: Profile })[];
  payer: Profile;
};

export type HouseholdWithMembers = Household & {
  profiles: Profile[];
  admin: Profile;
};
