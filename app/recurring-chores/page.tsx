'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  Plus,
  Settings,
  Trash2,
  Edit,
  PlayCircle,
  PauseCircle,
  RotateCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';
import { RecurringChoreDialog } from '@/components/recurring-chores/recurring-chore-dialog';

export default function RecurringChoresPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChoreTemplate | null>(null);

  // Fetch recurring templates
  const { data: templates = [], isLoading } = useQuery({
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
    enabled: !!profile?.household_id,
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
        .update({ is_recurring: !isRecurring, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
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
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  const recurringTemplates = templates.filter((t) => t.is_recurring);
  const oneTimeTemplates = templates.filter((t) => !t.is_recurring);

  const handleEdit = (template: ChoreTemplate) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const formatRecurringSchedule = (
    type: string | null,
    interval: number | null
  ) => {
    if (!type || !interval) return 'Not configured';

    const unit = type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month';
    return interval === 1
      ? `Every ${unit}`
      : `Every ${interval} ${unit}s`;
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Recurring Chores</h1>
            <p className="text-muted-foreground mt-1">
              Automatically create and assign chores on a schedule
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Recurring Templates Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <RotateCw className="mr-2 h-5 w-5" />
            Active Recurring Templates ({recurringTemplates.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : recurringTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No recurring templates yet.</p>
                <p className="text-sm mt-2">
                  Create a template to automatically generate chores on a schedule.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recurringTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
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
                            Next: {formatNextCreation(template.next_creation_date)}
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

                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
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
                          >
                            <PauseCircle className="mr-1 h-3 w-3" />
                            Pause
                          </Button>
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
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* One-Time Templates Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            One-Time Templates ({oneTimeTemplates.length})
          </h2>

          {oneTimeTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No one-time templates.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {oneTimeTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
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
                      >
                        <PlayCircle className="mr-1 h-3 w-3" />
                        Enable
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Dialog for creating/editing templates */}
        <RecurringChoreDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          template={selectedTemplate}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
            setIsDialogOpen(false);
            setSelectedTemplate(null);
          }}
        />
      </motion.div>
    </div>
  );
}
