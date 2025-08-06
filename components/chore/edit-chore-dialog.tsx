import { ChoreUpdateData } from '@/app/chores/page';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Chore, Profile, RecurringType } from '@/lib/supabase/types';
import { CalendarDays, Edit, Repeat, Trash2, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

// Form data interface for internal state
interface FormData {
  name: string;
  description: string;
  assigned_to: string; // Can be member ID or "unassigned"
  due_date: Date | null;
  status: 'pending' | 'completed' | 'overdue';
  recurring_type: 'daily' | 'weekly' | 'monthly' | 'none';
  recurring_interval: number;
}

// Data to submit to parent

interface EditChoreDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChoreUpdated?: (chore: Chore) => void;
  onChoreDeleted?: (choreId: string) => void;
  onUpdateChore?: (
    choreId: string,
    updateData: ChoreUpdateData
  ) => Promise<void>;
  onDeleteChore?: (choreId: string) => Promise<void>;
  chore: Chore | null;
  currentUserId: string;
  householdMembers?: Profile[];
}

type RecurringTypeOption = {
  value: RecurringType;
  label: string;
};

const EditChoreDialog: React.FC<EditChoreDialogProps> = ({
  isOpen,
  onOpenChange,
  onChoreUpdated,
  onChoreDeleted,
  onUpdateChore,
  onDeleteChore,
  chore,
  currentUserId,
  householdMembers = [],
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    assigned_to: 'unassigned',
    due_date: null,
    status: 'pending',
    recurring_type: 'none',
    recurring_interval: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type StatusType = {
    value: 'pending' | 'completed' | 'overdue';
    label: string;
    color: string;
  };

  const recurringTypes: RecurringTypeOption[] = [
    { value: 'none', label: 'No Repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const statusTypes: StatusType[] = [
    {
      value: 'pending',
      label: 'Pending',
      color: 'bg-orange-100 text-orange-800',
    },
    {
      value: 'completed',
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
    },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  ];

  // Populate form when chore changes
  useEffect(() => {
    if (chore && isOpen) {
      setFormData({
        name: chore.name || '',
        description: chore.description || '',
        assigned_to: chore.assigned_to || 'unassigned',
        due_date: chore.due_date ? new Date(chore.due_date) : null,
        status: chore.status,
        recurring_type: chore.recurring_type || 'none',
        recurring_interval: chore.recurring_interval || 1,
      });
      setError(null);
    }
  }, [chore, isOpen]);

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const resetForm = (): void => {
    if (chore) {
      setFormData({
        name: chore.name || '',
        description: chore.description || '',
        assigned_to: chore.assigned_to || 'unassigned',
        due_date: chore.due_date ? new Date(chore.due_date) : null,
        status: chore.status,
        recurring_type: chore.recurring_type || 'none',
        recurring_interval: chore.recurring_interval || 1,
      });
    }
    setError(null);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!chore || !onUpdateChore) return;

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Please enter a chore name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for parent
      const choreUpdateData: ChoreUpdateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        assigned_to:
          formData.assigned_to === 'unassigned'
            ? undefined
            : formData.assigned_to,
        due_date: formData.due_date?.toISOString(),
        status: formData.status,
        recurring_type:
          formData.recurring_type === 'none'
            ? undefined
            : formData.recurring_type,
        recurring_interval:
          formData.recurring_type !== 'none'
            ? formData.recurring_interval
            : undefined,
      };

      // Call parent's update function
      await onUpdateChore(chore.id, choreUpdateData);

      console.log('Chore update requested:', choreUpdateData);

      // Close dialog on success
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating chore:', error);
      setError(error?.message || 'Failed to update chore. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!chore || !onDeleteChore) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${chore.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Call parent's delete function
      await onDeleteChore(chore.id);

      console.log('Chore deletion requested:', chore.id);

      // Close dialog on success
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting chore:', error);
      setError(error?.message || 'Failed to delete chore. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = (): void => {
    resetForm();
    onOpenChange(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleNumberInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = parseInt(e.target.value) || 1;
    handleInputChange('recurring_interval', Math.max(1, Math.min(365, value)));
  };

  if (!chore) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Chore
                </DialogTitle>
              </DialogHeader>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label htmlFor="choreName" className="text-sm font-medium">
                    Chore Name *
                  </Label>
                  <Input
                    id="choreName"
                    placeholder="e.g., Kitchen Deep Clean"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full"
                    disabled={isSubmitting || isDeleting}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label
                    htmlFor="choreDescription"
                    className="text-sm font-medium"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="choreDescription"
                    placeholder="Clean counters, stovetop, sink, and mop floor"
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    rows={3}
                    className="resize-none"
                    disabled={isSubmitting || isDeleting}
                  />
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assign to
                    </Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value: string) =>
                        handleInputChange('assigned_to', value)
                      }
                      disabled={isSubmitting || isDeleting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        </SelectItem>
                        {householdMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.full_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                                  {getInitials(member.full_name)}
                                </div>
                              )}
                              <span>
                                {member.id === currentUserId
                                  ? 'You'
                                  : member.full_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: FormData['status']) =>
                        handleInputChange('status', value)
                      }
                      disabled={isSubmitting || isDeleting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusTypes.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  status.color.split(' ')[0]
                                }`}
                              />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Due Date
                  </Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 justify-start text-left font-normal"
                          disabled={isSubmitting || isDeleting}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {formatDate(formData.due_date)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.due_date || undefined}
                          onSelect={(date: Date | undefined) =>
                            handleInputChange('due_date', date || null)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {formData.due_date && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleInputChange('due_date', null)}
                        disabled={isSubmitting || isDeleting}
                        title="Clear due date"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-4"
                >
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Recurring
                  </Label>
                  <Select
                    value={formData.recurring_type}
                    onValueChange={(value: FormData['recurring_type']) =>
                      handleInputChange('recurring_type', value)
                    }
                    disabled={isSubmitting || isDeleting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurringTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.recurring_type !== 'none' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Label className="text-sm">Every</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.recurring_interval}
                        onChange={handleNumberInputChange}
                        className="w-20"
                        disabled={isSubmitting || isDeleting}
                      />
                      <Label className="text-sm">
                        {formData.recurring_type === 'daily'
                          ? 'days'
                          : formData.recurring_type === 'weekly'
                          ? 'weeks'
                          : formData.recurring_type === 'monthly'
                          ? 'months'
                          : 'intervals'}
                      </Label>
                    </motion.div>
                  )}
                </motion.div>

                <DialogFooter className="flex justify-between pt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting || isDeleting}
                    >
                      Cancel
                    </Button>
                    <motion.div
                      whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                      whileTap={{ scale: isDeleting ? 1 : 0.98 }}
                    >
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isSubmitting || isDeleting || !onDeleteChore}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || isDeleting || !onUpdateChore}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Updating...' : 'Update Chore'}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default EditChoreDialog;
