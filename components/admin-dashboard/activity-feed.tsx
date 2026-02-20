'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/schema.alias';
import { formatDateRelatively } from '@/utils';
import {
  CheckCircle2,
  CreditCard,
  DollarSign,
  ListPlus,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ActivityItem =
  | {
      type: 'chore_created';
      id: string;
      timestamp: string;
      actorName: string;
      choreName: string;
      assigneeName: string | null;
    }
  | {
      type: 'chore_completed';
      id: string;
      timestamp: string;
      actorName: string;
      choreName: string;
    }
  | {
      type: 'expense_added';
      id: string;
      timestamp: string;
      actorName: string;
      description: string;
      amount: number;
    }
  | {
      type: 'payment';
      id: string;
      timestamp: string;
      fromName: string;
      toName: string;
      amount: number;
    }
  | {
      type: 'penalty';
      id: string;
      timestamp: string;
      actorName: string;
      reason: string;
      amount: number;
    };

type FilterType = 'all' | 'chores' | 'expenses' | 'payments' | 'penalties';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'chores', label: 'Chores' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'payments', label: 'Payments' },
  { value: 'penalties', label: 'Penalties' },
];

function ActivityIcon({ type }: { type: ActivityItem['type'] }) {
  switch (type) {
    case 'chore_created':
      return <ListPlus className="h-4 w-4 text-blue-500" />;
    case 'chore_completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'expense_added':
      return <DollarSign className="h-4 w-4 text-orange-500" />;
    case 'payment':
      return <CreditCard className="h-4 w-4 text-purple-500" />;
    case 'penalty':
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
  }
}

function ActivityDescription({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case 'chore_created':
      return (
        <p className="text-sm">
          <span className="font-medium">{item.actorName}</span> created a chore:{' '}
          <span className="font-medium">{item.choreName}</span>
          {item.assigneeName && (
            <span className="text-muted-foreground">
              {' '}
              (assigned to {item.assigneeName})
            </span>
          )}
        </p>
      );
    case 'chore_completed':
      return (
        <p className="text-sm">
          <span className="font-medium">{item.actorName}</span> completed a
          chore: <span className="font-medium">{item.choreName}</span>
        </p>
      );
    case 'expense_added':
      return (
        <p className="text-sm">
          <span className="font-medium">{item.actorName}</span> added an
          expense: {item.description} (
          <span className="font-medium">
            {item.amount.toLocaleString()} VND
          </span>
          )
        </p>
      );
    case 'payment':
      return (
        <p className="text-sm">
          <span className="font-medium">{item.fromName}</span> paid{' '}
          <span className="font-medium">{item.toName}</span>{' '}
          <span className="font-medium">
            {item.amount.toLocaleString()} VND
          </span>
        </p>
      );
    case 'penalty':
      return (
        <p className="text-sm">
          <span className="font-medium">{item.actorName}</span> was penalized:{' '}
          {item.reason} (
          <span className="font-medium text-red-600 dark:text-red-400">
            -{item.amount.toLocaleString()} VND
          </span>
          )
        </p>
      );
  }
}

export default function ActivityFeed({
  householdId,
}: {
  householdId: string;
}) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const supabase = createClient();

  useEffect(() => {
    fetchActivityData();
  }, [householdId]);

  async function fetchActivityData() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString();

      const items: ActivityItem[] = [];

      // Fetch all data in parallel
      const [choresResult, expensesResult, penaltiesResult, membersResult] =
        await Promise.all([
          supabase
            .from('chores')
            .select('*')
            .eq('household_id', householdId)
            .gte('created_at', since)
            .order('created_at', { ascending: false }),
          supabase
            .from('expenses')
            .select('*')
            .eq('household_id', householdId)
            .gte('created_at', since)
            .order('created_at', { ascending: false }),
          supabase
            .from('fund_penalties')
            .select('*')
            .eq('household_id', householdId)
            .gte('created_at', since)
            .order('created_at', { ascending: false }),
          // Get household members for payment_notes lookups
          supabase
            .from('profiles')
            .select('*')
            .eq('household_id', householdId),
        ]);

      const members: Profile[] = membersResult.data || [];
      const memberIds = members.map((m) => m.id);
      const memberMap = new Map(members.map((m) => [m.id, m]));

      // Fetch payment_notes using member IDs (no household_id column)
      const { data: paymentNotes } = await supabase
        .from('payment_notes')
        .select('*')
        .in('from_user_id', memberIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      // Process chores
      for (const chore of choresResult.data || []) {
        const creator = memberMap.get(chore.created_by);
        const assignee = chore.assigned_to
          ? memberMap.get(chore.assigned_to)
          : undefined;

        items.push({
          type: 'chore_created',
          id: `chore-created-${chore.id}`,
          timestamp: chore.created_at!,
          actorName: creator?.full_name || 'Unknown',
          choreName: chore.name,
          assigneeName: assignee?.full_name || null,
        });

        if (chore.status === 'completed' && chore.updated_at) {
          items.push({
            type: 'chore_completed',
            id: `chore-completed-${chore.id}`,
            timestamp: chore.updated_at,
            actorName: assignee?.full_name || creator?.full_name || 'Unknown',
            choreName: chore.name,
          });
        }
      }

      // Process expenses
      for (const expense of expensesResult.data || []) {
        const payer = memberMap.get(expense.paid_by);
        items.push({
          type: 'expense_added',
          id: `expense-${expense.id}`,
          timestamp: expense.created_at!,
          actorName: payer?.full_name || 'Unknown',
          description: expense.description,
          amount: expense.amount,
        });
      }

      // Process payment notes
      for (const note of paymentNotes || []) {
        const fromUser = memberMap.get(note.from_user_id);
        const toUser = memberMap.get(note.to_user_id);
        items.push({
          type: 'payment',
          id: `payment-${note.id}`,
          timestamp: note.created_at!,
          fromName: fromUser?.full_name || 'Unknown',
          toName: toUser?.full_name || 'Unknown',
          amount: note.amount,
        });
      }

      // Process penalties
      for (const penalty of penaltiesResult.data || []) {
        const user = memberMap.get(penalty.user_id);
        items.push({
          type: 'penalty',
          id: `penalty-${penalty.id}`,
          timestamp: penalty.created_at!,
          actorName: user?.full_name || 'Unknown',
          reason: penalty.reason,
          amount: penalty.amount,
        });
      }

      // Sort by timestamp descending
      items.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(items);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    return activities.filter((item) => {
      switch (filter) {
        case 'chores':
          return (
            item.type === 'chore_created' || item.type === 'chore_completed'
          );
        case 'expenses':
          return item.type === 'expense_added';
        case 'payments':
          return item.type === 'payment';
        case 'penalties':
          return item.type === 'penalty';
        default:
          return true;
      }
    });
  }, [activities, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity History</CardTitle>
        <CardDescription>Last 30 days of household activity</CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {FILTER_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No activity found for this period.
          </p>
        ) : (
          <div className="space-y-1">
            {filteredActivities.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 border-b last:border-0"
              >
                <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ActivityIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <ActivityDescription item={item} />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateRelatively(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
