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
import { CalendarDays, Plus, Repeat, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';

interface AddChoreDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChoreAdded?: (chore: Chore) => void;
  householdId: string;
  currentUserId: string;
  householdMembers?: Profile[];
}

interface FormData {
  name: string;
  description: string;
  assigned_to: string;
  due_date: Date | null;
  recurring_type: RecurringType;
  recurring_interval: number;
}

interface ChoreCreateData {
  household_id: string;
  name: string;
  description?: string;
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  status: 'pending';
  recurring_type?: 'daily' | 'weekly' | 'monthly' | 'none';
  recurring_interval?: number;
}

const AddChoreDialog: React.FC<AddChoreDialogProps> = ({
  isOpen,
  onOpenChange,
  onChoreAdded,
  householdId,
  currentUserId,
  householdMembers = [],
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    assigned_to: '',
    due_date: null,
    recurring_type: 'none',
    recurring_interval: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  type RecurringTypeOption = {
    value: RecurringType;
    label: string;
  };

  const recurringTypes: RecurringTypeOption[] = [
    { value: 'none', label: 'No Repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = (): void => {
    setFormData({
      name: '',
      description: '',
      assigned_to: '',
      due_date: null,
      recurring_type: 'none',
      recurring_interval: 1,
    });
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
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Please enter a chore name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for Supabase
      const choreCreateData: ChoreCreateData = {
        household_id: householdId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        assigned_to: formData.assigned_to || undefined,
        created_by: currentUserId,
        due_date: formData.due_date?.toISOString(),
        status: 'pending',
        recurring_type:
          formData.recurring_type === 'none'
            ? undefined
            : formData.recurring_type,
        recurring_interval:
          formData.recurring_type !== 'none'
            ? formData.recurring_interval
            : undefined,
      };

      // Here you would call your Supabase insert function
      // const { data, error } = await supabase.from('chores').insert(choreCreateData).select().single();
      // if (error) throw error;

      console.log('Submitting chore:', choreCreateData);

      // Mock response for demo - replace with actual Supabase response
      const mockChore: Chore = {
        id: crypto.randomUUID(),
        ...choreCreateData,
        description: choreCreateData.description || '',
        assigned_to: choreCreateData.assigned_to || '',
        due_date: choreCreateData.due_date || '',
        recurring_type: choreCreateData.recurring_type || 'none',
        recurring_interval: choreCreateData.recurring_interval || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Call the callback to notify parent component
      if (onChoreAdded) {
        onChoreAdded(mockChore);
      }

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding chore:', error);
      alert('Failed to add chore. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                  <Plus className="w-5 h-5" />
                  Add New Chore
                </DialogTitle>
              </DialogHeader>

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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                </motion.div>

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
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        disabled={isSubmitting}
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
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
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
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
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
                        disabled={isSubmitting}
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

                <DialogFooter className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <motion.div
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {isSubmitting ? 'Adding...' : 'Add Chore'}
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

export default AddChoreDialog;
