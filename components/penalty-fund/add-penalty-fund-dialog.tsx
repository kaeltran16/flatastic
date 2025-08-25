'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import {
  CheckCircle,
  ChevronDown,
  DollarSign,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import UserAvatar from '../user-avatar';

interface AddPenaltyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  householdMembers: Profile[];
  recentChores: (Chore & {
    profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  })[];
  currentUser: Profile;
  isLoading?: boolean;
  onPenaltyAdded?: () => void;
}

interface FormData {
  amount: string;
  userId: string;
  reason: string;
  choreId: string;
  description: string;
}

const AddPenaltyDialog: React.FC<AddPenaltyDialogProps> = ({
  isOpen,
  onOpenChange,
  householdId,
  householdMembers,
  recentChores,
  currentUser,
  isLoading = false,
  onPenaltyAdded,
}) => {
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    userId: '',
    reason: '',
    choreId: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const penaltyReasons = [
    { value: 'Missed chore deadline', icon: '⏰' },
    { value: 'Incomplete task', icon: '❌' },
    { value: 'Forgot to complete chore', icon: '🤔' },
    { value: 'Late completion', icon: '⏳' },
    { value: 'Damage or poor quality', icon: '🔧' },
    { value: 'Other', icon: '📝' },
  ];

  const relatedChores = useMemo(() => {
    return recentChores.filter(
      (chore) => chore.assigned_to === formData.userId
    );
  }, [recentChores, formData.userId]);

  const quickAmounts = ['5.00', '10.00', '15.00', '20.00'];

  // Helper function to get status color and variant
  const getChoreStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'overdue':
      case 'missed':
        return { variant: 'destructive' as const, color: 'text-red-700' };
      case 'incomplete':
        return { variant: 'secondary' as const, color: 'text-yellow-700' };
      case 'late':
        return { variant: 'outline' as const, color: 'text-orange-700' };
      default:
        return { variant: 'outline' as const, color: 'text-gray-700' };
    }
  };

  // Helper function to format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickAmount = (amount: string) => {
    setFormData((prev) => ({ ...prev, amount }));
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      userId: '',
      reason: '',
      choreId: '',
      description: '',
    });
    setExpandedSection(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.amount || !formData.userId || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Insert fund penalty record
      const { error: fundError } = await supabase
        .from('fund_penalties')
        .insert({
          household_id: householdId,
          user_id: formData.userId,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          chore_id: formData.choreId || null,
          description: formData.description || null,
          created_at: new Date().toISOString(),
        });

      if (fundError) throw fundError;

      // Create notification for the penalized user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          household_id: householdId,
          user_id: formData.userId,
          type: 'fund_penalty',
          title: 'Household Fund Penalty',
          message: `You've been charged $${formData.amount} for: ${formData.reason}`,
          is_urgent: true,
          is_read: false,
        });

      if (notificationError) throw notificationError;

      setShowSuccess(true);

      // Call callback if provided
      if (onPenaltyAdded) {
        onPenaltyAdded();
      }

      // Close dialog after successful submission
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding fund penalty:', error);
      alert('Failed to add penalty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const isFormValid = formData.amount && formData.userId && formData.reason;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent className="w-[95vw] max-w-md mx-auto my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <DialogHeader className="pb-4 sm:pb-6">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Add Fund Penalty
                </DialogTitle>
              </DialogHeader>

              {/* Success Alert */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 font-medium text-sm">
                        🎉 Penalty added successfully!
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4 sm:space-y-6">
                {/* Select Member */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Select Member *
                  </Label>
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="p-3 border-2 border-dashed rounded-lg animate-pulse"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                            <div className="space-y-1 flex-1">
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Select
                      value={formData.userId}
                      onValueChange={(value) =>
                        handleSelectChange('userId', value)
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full h-11 sm:h-10 text-base sm:text-sm">
                        <SelectValue placeholder="Select a household member" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {householdMembers.map((member) => (
                          <SelectItem
                            key={member.id}
                            value={member.id}
                            className="py-3 sm:py-2"
                          >
                            <UserAvatar
                              user={member}
                              showAsYou={member.id === currentUser.id}
                            />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </motion.div>

                {/* Penalty Amount */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium">
                    Penalty Amount *
                  </Label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((amount, index) => (
                        <motion.button
                          key={amount}
                          onClick={() => handleQuickAmount(amount)}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                            formData.amount === amount
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          type="button"
                          disabled={isSubmitting}
                          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                        >
                          ${amount}
                        </motion.button>
                      ))}
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Custom amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        className="pl-9 h-11 sm:h-10 text-base sm:text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Reason */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="text-sm font-medium">Reason *</Label>
                  <Select
                    value={formData.reason}
                    onValueChange={(value) =>
                      handleSelectChange('reason', value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full h-11 sm:h-10 text-base sm:text-sm">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {penaltyReasons.map((reason) => (
                        <SelectItem
                          key={reason.value}
                          value={reason.value}
                          className="py-3 sm:py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{reason.icon}</span>
                            <span className="text-base sm:text-sm">
                              {reason.value}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Optional Details - Collapsible */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-3"
                >
                  <motion.button
                    type="button"
                    onClick={() =>
                      setExpandedSection(
                        expandedSection === 'details' ? null : 'details'
                      )
                    }
                    className="flex items-center justify-between w-full text-left"
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting}
                  >
                    <Label className="text-sm font-medium text-gray-700">
                      Additional Details (Optional)
                    </Label>
                    <motion.div
                      animate={{
                        rotate: expandedSection === 'details' ? 180 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {expandedSection === 'details' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        {/* Related Chore */}
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">
                            Related Chore
                          </Label>
                          {isLoading ? (
                            <div className="bg-gray-100 rounded-lg animate-pulse flex items-center px-3">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              <span className="ml-2 text-sm text-gray-500">
                                Loading chores...
                              </span>
                            </div>
                          ) : relatedChores.length > 0 ? (
                            <Select
                              value={formData.choreId}
                              onValueChange={(value) =>
                                handleSelectChange('choreId', value)
                              }
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="text-sm w-full">
                                <SelectValue placeholder="Select a chore (optional)" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[240px] w-full">
                                {relatedChores.map((chore) => (
                                  <SelectItem
                                    key={chore.id}
                                    value={chore.id}
                                    className="py-2 w-full"
                                  >
                                    <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                      {/* Left side: name and due date */}
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-medium text-sm truncate">
                                          {chore.name}
                                        </span>
                                        {chore.due_date && (
                                          <span className="text-xs text-gray-500 flex-shrink-0">
                                            {new Date(chore.due_date) <
                                            new Date() ? (
                                              <span className="text-red-600 font-medium">
                                                {new Date(
                                                  chore.due_date
                                                ).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                })}
                                              </span>
                                            ) : (
                                              new Date(
                                                chore.due_date
                                              ).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                              })
                                            )}
                                          </span>
                                        )}
                                      </div>

                                      <Badge
                                        variant={
                                          getChoreStatusBadgeProps(
                                            chore.status || ''
                                          ).variant
                                        }
                                        className="text-xs px-1.5 py-0.5 flex-shrink-0 h-5"
                                      >
                                        {chore.status}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-gray-200 rounded-lg text-center">
                              <p className="text-sm text-gray-500">
                                No recent chores found for this member
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                Chores assigned to the selected member will
                                appear here
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">
                            Additional Notes
                          </Label>
                          <Textarea
                            name="description"
                            placeholder="Any additional details..."
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            className="resize-none text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-6 sm:pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm"
                >
                  Cancel
                </Button>
                <motion.div
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className="w-full text-base sm:text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add ${formData.amount || '0.00'} Penalty
                      </>
                    )}
                  </Button>
                </motion.div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};

export default AddPenaltyDialog;
