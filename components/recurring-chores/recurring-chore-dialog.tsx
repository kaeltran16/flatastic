'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/use-profile';
import {
    createChoreTemplate,
    updateChoreTemplate,
} from '@/lib/actions/chore-template';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';

import { useHouseholdMembers } from '@/hooks/use-household-member';

interface RecurringChoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ChoreTemplate | null;
  onSuccess: () => void;
}

export function RecurringChoreDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: RecurringChoreDialogProps) {
  const { profile } = useProfile();
  const { members } = useHouseholdMembers(profile?.household_id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_recurring: false,
    recurring_type: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurring_interval: 1,
    recurring_start_date: new Date().toISOString().split('T')[0],
    auto_assign_rotation: true,
    next_creation_date: '',
    next_assignee_id: 'auto', // 'auto' or uuid
  });

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        is_recurring: template.is_recurring ?? false,
        recurring_type: (template.recurring_type as 'daily' | 'weekly' | 'monthly') || 'weekly',
        recurring_interval: template.recurring_interval || 1,
        recurring_start_date:
          template.recurring_start_date?.split('T')[0] ||
          new Date().toISOString().split('T')[0],
        auto_assign_rotation: template.auto_assign_rotation ?? true,
        next_creation_date: template.next_creation_date ? template.next_creation_date.split('T')[0] : '',
        next_assignee_id: template.next_assignee_id || 'auto',
      });
    } else {
      // Reset form for new template
      setFormData({
        name: '',
        description: '',
        is_recurring: false,
        recurring_type: 'weekly',
        recurring_interval: 1,
        recurring_start_date: new Date().toISOString().split('T')[0],
        auto_assign_rotation: true,
        next_creation_date: '',
        next_assignee_id: 'auto',
      });
    }
  }, [template, open]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.household_id) {
        throw new Error('No household found');
      }

      const payload: any = {
        ...data,
        next_assignee_id: data.next_assignee_id === 'auto' ? null : data.next_assignee_id,
        // Only send next_creation_date if it's set and valid
        next_creation_date: data.next_creation_date ? new Date(data.next_creation_date).toISOString() : undefined,
      };

      if (template) {
        // Update existing template
        return await updateChoreTemplate({
          id: template.id,
          ...payload,
        });
      } else {
        // Create new template
        return await createChoreTemplate({
          ...payload,
          household_id: profile.household_id,
        });
      }
    },
    onSuccess: () => {
      toast.success(
        template
          ? 'Template updated successfully'
          : 'Template created successfully'
      );
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (formData.is_recurring) {
      if (!formData.recurring_type || formData.recurring_interval < 1) {
        toast.error('Please configure the recurring schedule');
        return;
      }
      if (!formData.recurring_start_date) {
        toast.error('Start date is required for recurring templates');
        return;
      }
    }

    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update the chore template details and recurring settings.'
              : 'Create a new chore template with optional recurring schedule.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Take out trash"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any additional details..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Enable Recurring */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_recurring">Enable Recurring</Label>
              <div className="text-sm text-muted-foreground">
                Automatically create this chore on a schedule
              </div>
            </div>
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_recurring: checked })
              }
            />
          </div>

          {/* Recurring Settings (only show if enabled) */}
          {formData.is_recurring && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium">Recurring Schedule</h4>

              {/* Recurring Type */}
              <div className="space-y-2">
                <Label htmlFor="recurring_type">Frequency *</Label>
                <Select
                  value={formData.recurring_type}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                    setFormData({ ...formData, recurring_type: value })
                  }
                >
                  <SelectTrigger id="recurring_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring Interval */}
              <div className="space-y-2">
                <Label htmlFor="recurring_interval">
                  Repeat Every * (
                  {formData.recurring_type === 'daily'
                    ? 'days'
                    : formData.recurring_type === 'weekly'
                    ? 'weeks'
                    : 'months'}
                  )
                </Label>
                <Input
                  id="recurring_interval"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.recurring_interval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring_interval: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="recurring_start_date">Start Date *</Label>
                <Input
                  id="recurring_start_date"
                  type="date"
                  value={formData.recurring_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring_start_date: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* Manual Overrides Section (Only when editing) */}
              {template && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <h5 className="text-sm font-medium text-muted-foreground">Manual Adjustments</h5>
                  
                  {/* Next Scheduled Date Override */}
                  <div className="space-y-2">
                    <Label htmlFor="next_creation_date">Next Scheduled Date</Label>
                    <Input
                      id="next_creation_date"
                      type="date"
                      value={formData.next_creation_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          next_creation_date: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Manually set when the next chore will be created.
                    </p>
                  </div>

                  {/* Next Assignee Override */}
                  <div className="space-y-2">
                    <Label htmlFor="next_assignee_id">Next Assignee Override</Label>
                    <Select
                      value={formData.next_assignee_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, next_assignee_id: value })
                      }
                    >
                      <SelectTrigger id="next_assignee_id">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Rotation)</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Override who gets the next chore. Rotation will resume after.
                    </p>
                  </div>
                </div>
              )}

              {/* Auto Assign Rotation */}
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_assign_rotation">
                    Use Rotation Assignment
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    Assign chores to users in rotation
                  </div>
                </div>
                <Switch
                  id="auto_assign_rotation"
                  checked={formData.auto_assign_rotation}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_assign_rotation: checked })
                  }
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? 'Saving...'
                : template
                ? 'Update Template'
                : 'Create Template'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
