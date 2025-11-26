'use client';

import AdminHeroStats from '@/components/admin-dashboard/admin-hero-stats';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { sendChoreReminders } from '@/lib/actions/chore';
import { createClient } from '@/lib/supabase/client';
import { ChoreWithProfile, Profile } from '@/lib/supabase/schema.alias';
import { format } from 'date-fns';
import {
  Bell,
  Calendar,
  CheckCircle2,
  User
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface DashboardStats {
  latestChore: ChoreWithProfile | null;
  unfinishedChores: ChoreWithProfile[];
  lastCompletedChore: ChoreWithProfile | null;
  totalPending: number;
  totalOverdue: number;
}

export default function AdminDashboardClient({
  householdId,
}: {
  householdId: string;
}) {
  const [stats, setStats] = useState<DashboardStats>({
    latestChore: null,
    unfinishedChores: [],
    lastCompletedChore: null,
    totalPending: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, [householdId]);

  async function fetchDashboardData() {
    try {
      const now = new Date().toISOString();

      // latest chore created
      const { data: latestChore } = await supabase
        .from('chores')
        .select(
          `
          *,
          assignee:profiles!chores_assigned_to_fkey(*),
          creator:profiles!chores_created_by_fkey(*)
        `
        )
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // unfinished chores (pending + overdue)
      const { data: unfinishedChores } = await supabase
        .from('chores')
        .select(
          `
          *,
          assignee:profiles!chores_assigned_to_fkey(*),
          creator:profiles!chores_created_by_fkey(*)
        `
        )
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      // last completed chore
      const { data: lastCompletedChore } = await supabase
        .from('chores')
        .select(
          `
          *,
          assignee:profiles!chores_assigned_to_fkey(*),
          creator:profiles!chores_created_by_fkey(*)
        `
        )
        .eq('household_id', householdId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // count pending vs overdue
      const pending =
        unfinishedChores?.filter(
          (c) => !c.due_date || new Date(c.due_date) > new Date()
        ) || [];
      const overdue =
        unfinishedChores?.filter(
          (c) => c.due_date && new Date(c.due_date) < new Date()
        ) || [];

      setStats({
        latestChore: latestChore ? {
          ...latestChore,
          assignee: latestChore.assignee || undefined,
          creator: latestChore.creator as unknown as Profile,
        } : null,
        unfinishedChores: unfinishedChores ? unfinishedChores.map((chore) => ({
          ...chore,
          assignee: chore.assignee || undefined,
          creator: chore.creator as unknown as Profile,
        })) : [],
        lastCompletedChore: lastCompletedChore ? {
          ...lastCompletedChore,
          assignee: lastCompletedChore.assignee || undefined,
          creator: lastCompletedChore.creator as unknown as Profile,
        } : null,
        totalPending: pending.length,
        totalOverdue: overdue.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function sendReminders() {
    setSendingReminder(true);
    setReminderMessage(null);

    try {
      const result = await sendChoreReminders(householdId);

      if (result.success) {
        setReminderMessage(
          `✅ Sent ${result.notificationsSent} reminder${
            result.notificationsSent !== 1 ? 's' : ''
          } for chores due today`
        );
      } else {
        setReminderMessage('❌ Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      setReminderMessage('❌ Error sending reminders');
    } finally {
      setSendingReminder(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Household chore overview and management
              </p>
            </div>
            <Button
              onClick={sendReminders}
              disabled={sendingReminder}
              className="gap-2 rounded-xl"
            >
              <Bell className="h-4 w-4" />
              {sendingReminder ? 'Sending...' : 'Send Reminders'}
            </Button>
          </div>
        </motion.div>

      {reminderMessage && (
        <Alert>
          <AlertDescription>{reminderMessage}</AlertDescription>
        </Alert>
      )}

      <AdminHeroStats stats={stats} loading={loading} />

      {/* detailed cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* latest chore */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Chore</CardTitle>
            <CardDescription>Most recently created</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.latestChore ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{stats.latestChore.name}</h3>
                  {stats.latestChore.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats.latestChore.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {stats.latestChore.assignee?.full_name || 'Unassigned'}
                  </span>
                </div>

                {stats.latestChore.due_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(
                        new Date(stats.latestChore.due_date),
                        'MMM d, yyyy h:mm a'
                      )}
                    </span>
                  </div>
                )}

                <Badge
                  variant={
                    stats.latestChore.status === 'completed'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {stats.latestChore.status}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No chores yet</p>
            )}
          </CardContent>
        </Card>

        {/* last person who did a chore */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Completed By</CardTitle>
            <CardDescription>Most recent completion</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.lastCompletedChore ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {stats.lastCompletedChore.assignee?.full_name ||
                        'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.lastCompletedChore.assignee?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium">
                    {stats.lastCompletedChore.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed{' '}
                    {format(
                      new Date(stats.lastCompletedChore.updated_at!),
                      'MMM d, yyyy'
                    )}
                  </p>
                </div>

                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed chores yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* unfinished chores summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unfinished Chores</CardTitle>
            <CardDescription>Pending and overdue tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.unfinishedChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All chores completed! 🎉
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {stats.unfinishedChores.slice(0, 5).map((chore) => {
                    const isOverdue =
                      chore.due_date && new Date(chore.due_date) < new Date();

                    return (
                      <div
                        key={chore.id}
                        className="flex items-start justify-between p-2 rounded-md border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {chore.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {chore.assignee?.full_name || 'Unassigned'}
                          </p>
                        </div>
                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="ml-2 shrink-0"
                          >
                            Overdue
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {stats.unfinishedChores.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{stats.unfinishedChores.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
