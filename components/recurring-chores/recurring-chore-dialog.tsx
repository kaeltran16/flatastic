'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChoreTemplate } from '@/lib/supabase/schema.alias';
import {
  createChoreTemplate,
  updateChoreTemplate,
} from '@/lib/actions/chore-template';
import { useProfile } from '@/hooks/use-profile';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_recurring: false,
    recurring_type: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurring_interval: 1,
    recurring_start_date: new Date().toISOString().split('T')[0],
    auto_assign_rotation: true,
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
          template.recurring_start_date ||
          new Date().toISOString().split('T')[0],
        auto_assign_rotation: template.auto_assign_rotation ?? true,
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
      });
    }
  }, [template, open]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.household_id) {
        throw new Error('No household found');
      }

      if (template) {
        // Update existing template
        return await updateChoreTemplate({
          id: template.id,
          ...data,
        });
      } else {
        // Create new template
        return await createChoreTemplate({
          ...data,
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
      <DialogContent className="sm:max-w-[500px]">
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

              {/* Auto Assign Rotation */}
              <div className="flex items-center justify-between">
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
