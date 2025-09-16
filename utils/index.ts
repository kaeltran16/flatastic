import { TZDate } from '@date-fns/tz';
import {
  differenceInDays,
  endOfDay,
  format,
  formatDistanceToNow,
  startOfDay,
} from 'date-fns';
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const formatDate = (
  dateString: string,
  option: { format: string } = { format: 'dd MMM yyyy' }
) => {
  const date = new Date(dateString);
  return format(date, option.format);
};

export const formatDateRelatively = (
  dateString: string,
  option: { addSuffix?: boolean } = { addSuffix: true }
) => {
  const LARGE_DATE_THRESHOLD = 14;
  const date = new Date(dateString);
  const now = new Date();

  const diffInDays = Math.abs(differenceInDays(date, now));

  if (diffInDays > LARGE_DATE_THRESHOLD) {
    return formatDate(dateString);
  }

  return formatDistanceToNow(date, option);
};

export const getChoreStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
  }
};

export const getChoreRecurringTypeColor = (recurringType: string) => {
  switch (recurringType) {
    case 'daily':
      return 'bg-[#3b82f6]'; // green-500 → repeat often
    case 'weekly':
      return 'bg-[#a855f7]'; // blue-500 → stable rhythm
    case 'monthly':
      return 'bg-[#f59e0b]'; // purple-500 → more spaced out
  }
};

export const toISOStartOfDayInTZ = (date: Date, timeZone = 'Asia/Ho_Chi_Minh') => {
  // Convert to TZDate first
  const tzDate = TZDate.tz(timeZone, date);

  // Use startOfDay function - it will work with TZDate
  const startOfDayTZ = startOfDay(tzDate);

  return startOfDayTZ.toISOString();
};

export const toISOEndOfDayInTZ = (
  date: Date,
  timeZone = 'Asia/Ho_Chi_Minh'
) => {
  const tzDate = TZDate.tz(timeZone, date);
  const endOfDayTZ = endOfDay(tzDate);
  return endOfDayTZ.toISOString();
};
