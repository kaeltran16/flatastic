import type { ExpenseSplit } from '@/lib/supabase/types';

export interface Balance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
  related_splits: ExpenseSplit[];
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
