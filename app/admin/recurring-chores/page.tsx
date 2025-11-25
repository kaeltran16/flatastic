'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Activity,
    AlertCircle,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    Loader2,
    PauseCircle,
    PlayCircle,
    Plus,
    RotateCw,
    Trash2,
    TrendingUp,
    UserCheck,
    Users,
    UserX,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { RecurringChoreDialog } from '@/components/recurring-chores/recurring-chore-dialog';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHousehold } from '@/hooks/use-household';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import {
  getNextAssignedUser,
  getNextDueDate,
  manuallyTriggerChoreCreation,
} from '@/lib/actions/chore-template';
import { createClient } from '@/lib/supabase/client';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';

interface HouseholdStats {
  totalChores: number;
  completedChores: number;
  pendingChores: number;
  overdueChores: number;
  completionRate: number;
  activeRecurringTemplates: number;
}

interface RecentChore {
  id: string;
  name: string;
  created_at: string;
  assigned_to: string;
  assignee_name: string;
  template_name: string;
  status: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useProfile();
  const { members, loading: membersLoading } = useHouseholdMembers(
    profile?.household_id || null
  );
  const { household, loading: householdLoading } = useHousehold(
    profile?.household_id || null
  );
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChoreTemplate | null>(
    null
  );

  // Check if user is admin
  const isAdmin = household && profile ? household.admin_id === profile.id : false;

  // Redirect non-admins
  useEffect(() => {
    if (!profileLoading && !membersLoading && !householdLoading && !isAdmin && profile) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }, [isAdmin, profileLoading, membersLoading, householdLoading, profile, router]);

  // Fetch household stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['household-stats', profile?.household_id],
    queryFn: async (): Promise<HouseholdStats> => {
      if (!profile?.household_id) throw new Error('No household');

      const supabase = createClient();

      // Get all chores
      const { data: chores } = await supabase
        .from('chores')
        .select('status')
        .eq('household_id', profile.household_id);

      // Get active recurring templates
      const { data: templates } = await supabase
        .from('chore_templates')
        .select('id')
        .eq('household_id', profile.household_id)
        .eq('is_active', true)
        .eq('is_recurring', true);

      const total = chores?.length || 0;
      const completed = chores?.filter((c) => c.status === 'completed').length || 0;
      const pending = chores?.filter((c) => c.status === 'pending').length || 0;
      const overdue = chores?.filter((c) => c.status === 'overdue').length || 0;

      return {
        totalChores: total,
        completedChores: completed,
        pendingChores: pending,
        overdueChores: overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        activeRecurringTemplates: templates?.length || 0,
      };
    },
    enabled: !!profile?.household_id && isAdmin,
  });

  // Fetch recurring templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['recurring-templates', profile?.household_id],
    queryFn: async () => {
      if (!profile?.household_id) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('chore_templates')
        .select('*')
        .eq('household_id', profile.household_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as ChoreTemplate[];
    },
    enabled: !!profile?.household_id && isAdmin,
  });

  // Fetch recent chore creations from recurring templates
  const { data: recentChores = [], isLoading: recentChoresLoading } = useQuery({
    queryKey: ['recent-recurring-chores', profile?.household_id],
    queryFn: async (): Promise<RecentChore[]> => {
      if (!profile?.household_id) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('chores')
        .select(
          `
          id,
          name,
          created_at,
          assigned_to,
          status,
          template_id,
          profiles!chores_assigned_to_fkey(full_name),
          chore_templates(name)
        `
        )
        .eq('household_id', profile.household_id)
        .not('template_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((chore: any) => ({
        id: chore.id,
        name: chore.name,
        created_at: chore.created_at,
        assigned_to: chore.assigned_to,
        assignee_name: chore.profiles?.full_name || 'Unassigned',
        template_name: chore.chore_templates?.name || 'Unknown',
        status: chore.status,
      }));
    },
    enabled: !!profile?.household_id && isAdmin,
  });

  // Toggle recurring status
  const toggleRecurringMutation = useMutation({
    mutationFn: async ({
      templateId,
      isRecurring,
    }: {
      templateId: string;
      isRecurring: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('chore_templates')
        .update({
          is_recurring: !isRecurring,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['household-stats'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('chore_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['household-stats'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  // Manually trigger chore creation
  const manualTriggerMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const result = await manuallyTriggerChoreCreation(templateId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create chore');
      }
      return result;
    },
    onSuccess: (data, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      queryClient.invalidateQueries({ queryKey: ['recent-recurring-chores'] });
      queryClient.invalidateQueries({ queryKey: ['household-stats'] });
      queryClient.invalidateQueries({ queryKey: ['next-assigned-user', templateId] });
      queryClient.invalidateQueries({ queryKey: ['next-due-date', templateId] });
      // Invalidate chore queries so the chore list updates
      queryClient.invalidateQueries({ queryKey: ['chores'] });
      toast.success(
        `Chore created successfully! Assigned to ${data.chore?.assigned_user_name || 'user'}`
      );
    },
    onError: (error) => {
      toast.error('Failed to create chore: ' + error.message);
    },
  });

  const recurringTemplates = templates.filter((t) => t.is_recurring);
  const oneTimeTemplates = templates.filter((t) => !t.is_recurring);
  const availableMembers = members?.filter((m) => m.is_available) || [];
  const unavailableMembers = members?.filter((m) => !m.is_available) || [];

  const formatRecurringSchedule = (
    type: string | null,
    interval: number | null
  ) => {
    if (!type || !interval) return 'Not configured';
    const unit = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month';
    return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
  };

  const formatNextCreation = (date: string | null) => {
    if (!date) return 'Not scheduled';
    const nextDate = new Date(date);
    const now = new Date();
    const isPast = nextDate < now;

    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(nextDate);

    return isPast ? `Overdue (${formatted})` : formatted;
  };

  // Component to show next assignment info
  const NextAssignmentInfo = ({ templateId }: { templateId: string }) => {
    const { data: nextUser } = useQuery({
      queryKey: ['next-assigned-user', templateId],
      queryFn: () => getNextAssignedUser(templateId),
      refetchInterval: 30000, // Refresh every 30 seconds
    });

    const { data: nextDueDate } = useQuery({
      queryKey: ['next-due-date', templateId],
      queryFn: () => getNextDueDate(templateId),
      refetchInterval: 30000, // Refresh every 30 seconds
    });

    return (
      <div className="space-y-2 text-sm">
        {nextUser && (
          <div className="flex items-center text-muted-foreground">
            <UserCheck className="mr-2 h-4 w-4" />
            <span>
              Next assignee: <span className="font-medium text-foreground">{nextUser.userName}</span>
            </span>
          </div>
        )}
        {nextDueDate && (
          <div className="flex items-center text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>
              Will be due:{' '}
              <span className="font-medium text-foreground">
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: 'Asia/Ho_Chi_Minh',
                }).format(new Date(nextDueDate))}{' '}
                GMT+7
              </span>
            </span>
          </div>
        )}
      </div>
    );
  };

  const handleEdit = (template: ChoreTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  // Show loading state
  if (profileLoading || membersLoading || householdLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only accessible to household administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage recurring chores and view household statistics
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chores</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalChores || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingChores || 0} pending, {stats?.completedChores || 0}{' '}
                completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${stats?.completionRate || 0}%`}
              </div>
              <Progress
                value={stats?.completionRate || 0}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recurring Templates
              </CardTitle>
              <RotateCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.activeRecurringTemplates || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active automations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {availableMembers.length}/{members?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for assignments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Chores Alert */}
        {stats && stats.overdueChores > 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {stats.overdueChores} overdue chore{stats.overdueChores > 1 ? 's' : ''}.{' '}
              <a href="/chores" className="underline font-medium">
                View chores
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* No Available Members Alert */}
        {availableMembers.length === 0 && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No members are available for chore assignment. Manual chore creation is disabled.{' '}
              <a href="/household" className="underline font-medium">
                Manage member availability
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="recurring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recurring">Recurring Templates</TabsTrigger>
            <TabsTrigger value="members">Member Status</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Recurring Templates Tab */}
          <TabsContent value="recurring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Recurring Templates</CardTitle>
                <CardDescription>
                  Automatically create chores on a schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="text-center py-8">Loading templates...</div>
                ) : recurringTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No recurring templates yet.</p>
                    <p className="text-sm mt-2">
                      Create a template to automatically generate chores.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {recurringTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {template.name}
                              </CardTitle>
                              {template.description && (
                                <CardDescription className="mt-1">
                                  {template.description}
                                </CardDescription>
                              )}
                            </div>
                            <Badge variant="default" className="ml-2">
                              Active
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm">
                              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatRecurringSchedule(
                                  template.recurring_type,
                                  template.recurring_interval
                                )}
                              </span>
                            </div>

                            <div className="flex items-center text-sm">
                              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>
                                Next:{' '}
                                {formatNextCreation(template.next_creation_date)}
                              </span>
                            </div>

                            {template.last_created_at && (
                              <div className="text-sm text-muted-foreground">
                                Last created:{' '}
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                }).format(new Date(template.last_created_at))}
                              </div>
                            )}

                            <div className="pt-3 border-t">
                              <NextAssignmentInfo templateId={template.id} />
                            </div>

                            <div className="flex flex-col gap-2 pt-3 border-t">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  manualTriggerMutation.mutate(template.id)
                                }
                                disabled={
                                  manualTriggerMutation.isPending ||
                                  availableMembers.length === 0
                                }
                                className="w-full"
                              >
                                {manualTriggerMutation.isPending ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <PlayCircle className="mr-1 h-3 w-3" />
                                )}
                                Create Now
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                  className="flex-1"
                                >
                                  <Edit className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    toggleRecurringMutation.mutate({
                                      templateId: template.id,
                                      isRecurring: true,
                                    })
                                  }
                                  className="flex-1"
                                >
                                  <PauseCircle className="mr-1 h-3 w-3" />
                                  Pause
                                </Button>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (
                                    confirm(
                                      'Are you sure you want to delete this template?'
                                    )
                                  ) {
                                    deleteTemplateMutation.mutate(template.id);
                                  }
                                }}
                                className="w-full"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* One-Time Templates */}
            {oneTimeTemplates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Inactive Templates</CardTitle>
                  <CardDescription>
                    Templates not currently on a recurring schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    {oneTimeTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                manualTriggerMutation.mutate(template.id)
                              }
                              disabled={
                                manualTriggerMutation.isPending ||
                                availableMembers.length === 0
                              }
                            >
                              {manualTriggerMutation.isPending ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <PlayCircle className="mr-1 h-3 w-3" />
                              )}
                              Create Now
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(template)}
                                className="flex-1"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleRecurringMutation.mutate({
                                    templateId: template.id,
                                    isRecurring: false,
                                  })
                                }
                                className="flex-1"
                              >
                                <PlayCircle className="mr-1 h-3 w-3" />
                                Enable
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Member Status Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Available Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCheck className="mr-2 h-5 w-5 text-green-500" />
                    Available Members ({availableMembers.length})
                  </CardTitle>
                  <CardDescription>
                    Members included in rotation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {availableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No available members
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-medium">
                              {member.full_name || member.email}
                            </span>
                          </div>
                          <Badge variant="outline">Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unavailable Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserX className="mr-2 h-5 w-5 text-orange-500" />
                    Unavailable Members ({unavailableMembers.length})
                  </CardTitle>
                  <CardDescription>
                    Members excluded from rotation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {unavailableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All members are available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {unavailableMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="font-medium">
                              {member.full_name || member.email}
                            </span>
                          </div>
                          <Badge variant="outline">Paused</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Chore Creations</CardTitle>
                <CardDescription>
                  Chores created from recurring templates (last 10)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentChoresLoading ? (
                  <div className="text-center py-8">Loading activity...</div>
                ) : recentChores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm mt-2">
                      Chores will appear here when created from templates
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentChores.map((chore) => (
                      <div
                        key={chore.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{chore.name}</div>
                          <div className="text-sm text-muted-foreground">
                            From template: {chore.template_name} • Assigned to:{' '}
                            {chore.assignee_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            }).format(new Date(chore.created_at))}
                          </div>
                        </div>
                        <Badge
                          variant={
                            chore.status === 'completed'
                              ? 'default'
                              : chore.status === 'overdue'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {chore.status === 'completed' && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {chore.status === 'overdue' && (
                            <AlertCircle className="mr-1 h-3 w-3" />
                          )}
                          {chore.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog for creating/editing templates */}
        <RecurringChoreDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          template={selectedTemplate}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
            queryClient.invalidateQueries({ queryKey: ['household-stats'] });
            setIsDialogOpen(false);
            setSelectedTemplate(null);
          }}
        />
      </motion.div>
    </div>
  );
}
