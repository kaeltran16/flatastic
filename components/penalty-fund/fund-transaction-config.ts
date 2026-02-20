import { DollarSign, Gift, Plus, Sparkles } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export interface FundTransactionConfig {
  variant: 'penalty' | 'reward';
  title: string;
  icon: LucideIcon;
  iconColor: string;
  reasons: { value: string; icon: string }[];
  choreFilter: (chore: { assigned_to: string | null; status: string | null }, userId: string) => boolean;
  emptyChoresMessage: string;
  emptyChoresHint: string;
  amountTransform: (amount: number) => number;
  expenseCategory: string;
  expenseDescriptionPrefix: string;
  notificationType: string;
  notificationTitle: string;
  notificationMessage: (amount: string, reason: string) => string;
  notificationUrgent: boolean;
  successMessage: string;
  errorMessage: string;
  submitButtonText: (amount: string) => string;
  submitButtonIcon: LucideIcon;
  submitButtonClassName: string;
  choreStatusBadge: (status: string) => {
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
    color: string;
  };
}

export const PENALTY_CONFIG: FundTransactionConfig = {
  variant: 'penalty',
  title: 'Add Fund Penalty',
  icon: DollarSign,
  iconColor: 'text-red-600',
  reasons: [
    { value: 'Missed chore deadline', icon: '⏰' },
    { value: 'Incomplete task', icon: '❌' },
    { value: 'Forgot to complete chore', icon: '🤔' },
    { value: 'Late completion', icon: '⏳' },
    { value: 'Damage or poor quality', icon: '🔧' },
    { value: 'Other', icon: '📝' },
  ],
  choreFilter: (chore, userId) => chore.assigned_to === userId,
  emptyChoresMessage: 'No recent chores found for this member',
  emptyChoresHint: 'Chores assigned to the selected member will appear here',
  amountTransform: (amount) => amount,
  expenseCategory: 'penalty',
  expenseDescriptionPrefix: 'Penalty',
  notificationType: 'fund_penalty',
  notificationTitle: 'Household Fund Penalty',
  notificationMessage: (amount, reason) =>
    `You've been charged $${amount} for: ${reason}`,
  notificationUrgent: true,
  successMessage: '🎉 Penalty and expense added successfully!',
  errorMessage: 'Failed to add penalty. Please try again.',
  submitButtonText: (amount) => `Add $${amount || '0.00'} Penalty`,
  submitButtonIcon: Plus,
  submitButtonClassName: '',
  choreStatusBadge: (status) => {
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
  },
};

export const REWARD_CONFIG: FundTransactionConfig = {
  variant: 'reward',
  title: 'Add Fund Reward',
  icon: Gift,
  iconColor: 'text-green-600',
  reasons: [
    { value: 'Completed all chores on time', icon: '⭐' },
    { value: 'Extra tasks completed', icon: '💪' },
    { value: 'Exceptional quality work', icon: '🏆' },
    { value: 'Helped others with their chores', icon: '🤝' },
    { value: 'Initiative and responsibility', icon: '🌟' },
    { value: 'Other', icon: '🎁' },
  ],
  choreFilter: (chore, userId) =>
    chore.assigned_to === userId && chore.status === 'completed',
  emptyChoresMessage: 'No completed chores found for this member',
  emptyChoresHint:
    'Completed chores assigned to the selected member will appear here',
  amountTransform: (amount) => -Math.abs(amount),
  expenseCategory: 'reward',
  expenseDescriptionPrefix: 'Reward',
  notificationType: 'fund_reward',
  notificationTitle: 'Household Fund Reward',
  notificationMessage: (amount, reason) =>
    `You've earned $${amount} for: ${reason}`,
  notificationUrgent: false,
  successMessage: '🎉 Reward added successfully!',
  errorMessage: 'Failed to add reward. Please try again.',
  submitButtonText: (amount) => `Add $${amount || '0.00'} Reward`,
  submitButtonIcon: Sparkles,
  submitButtonClassName: 'bg-green-600 hover:bg-green-700',
  choreStatusBadge: (status) => {
    switch (status) {
      case 'completed':
        return { variant: 'default' as const, color: 'text-green-700' };
      case 'in_progress':
        return { variant: 'secondary' as const, color: 'text-blue-700' };
      default:
        return { variant: 'outline' as const, color: 'text-gray-700' };
    }
  },
};
