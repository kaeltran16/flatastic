import { useChores } from '@/hooks/use-chore';
import { useExpenses } from '@/hooks/use-expense';
import { useProfile } from '@/hooks/use-profile';
import { ChoreWithProfile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { useMemo } from 'react';

export type EventType = 'chore' | 'expense';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: EventType;
  status: 'pending' | 'completed' | 'overdue' | 'settled';
  resource: ChoreWithProfile | ExpenseWithDetails;
  color?: string;
  description?: string;
}

export function useCalendarEvents() {
  const { profile } = useProfile();
  const { data: chores = [], isLoading: choresLoading } = useChores(
    profile?.household_id || undefined
  );
  const { expenses = [], loading: expensesLoading } = useExpenses();

  const events = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Process Chores
    chores.forEach((chore) => {
      if (!chore.due_date) return;

      const dueDate = new Date(chore.due_date);
      
      // Determine color based on status
      let color = '#3b82f6'; // blue-500 (pending)
      if (chore.status === 'completed') color = '#22c55e'; // green-500
      else if (chore.status === 'overdue') color = '#ef4444'; // red-500

      calendarEvents.push({
        id: `chore-${chore.id}`,
        title: chore.name,
        start: dueDate,
        end: dueDate, // Chores are point-in-time, but calendar needs end date
        allDay: true,
        type: 'chore',
        status: chore.status as 'pending' | 'completed' | 'overdue',
        resource: chore,
        color,
        description: chore.description || undefined,
      });
    });

    // Process Expenses
    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      
      // Determine color based on status
      let color = '#a855f7'; // purple-500 (pending)
      if (expense.status === 'settled') color = '#10b981'; // emerald-500

      calendarEvents.push({
        id: `expense-${expense.id}`,
        title: `${expense.description} ($${expense.amount})`,
        start: expenseDate,
        end: expenseDate,
        allDay: true,
        type: 'expense',
        status: expense.status,
        resource: expense,
        color,
      });
    });

    return calendarEvents;
  }, [chores, expenses]);

  return {
    events,
    isLoading: choresLoading || expensesLoading,
  };
}
