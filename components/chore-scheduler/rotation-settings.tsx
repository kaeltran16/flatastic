import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { toISOStartOfDayInTZ } from '@/utils';
import { tz, TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { itemVariants } from './constants';
import { RotationSettings } from './types';

export interface RotationSettingsProps {
  rotationSettings: RotationSettings;
  setRotationSettings: (settings: RotationSettings) => void;
  timezone?: string;
}

export default function RotationSettingsComponent({
  rotationSettings,
  setRotationSettings,
  timezone = 'Asia/Ho_Chi_Minh',
}: RotationSettingsProps) {
  // Convert ISO string to Date object for the calendar
  const selectedDate = rotationSettings.startDate
    ? new Date(rotationSettings.startDate)
    : new Date();

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const picked = timezone ? TZDate.tz(timezone, date) : new Date(date);
      setRotationSettings({
        ...rotationSettings,
        startDate: toISOStartOfDayInTZ(picked, timezone),
      });
    }
  };

  // Helper function to get singular form
  const getSingularForm = (type: string) => {
    switch (type) {
      case 'daily': return 'day';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
      default: return type.slice(0, -2);
    }
  };

  // Helper function to get proper interval label
  const getIntervalLabel = (interval: number, type: string) => {
    if (interval === 1) {
      return `Every ${getSingularForm(type)}`;
    } else {
      return `Every ${interval} ${getSingularForm(type)}s`;
    }
  };

  return (
    <div className="space-y-4">
      <motion.div variants={itemVariants}>
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Start Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-11 justify-start text-left font-normal text-base sm:text-sm mt-1"
            >
              <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {format(
                  selectedDate,
                  'MMM dd, yyyy', // "Mar 15, 2024"
                  { in: tz(timezone) }
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent sideOffset={4}>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="scale-95 sm:scale-100"
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label className="text-sm font-medium">Rotation Frequency</Label>
        <Select
          value={rotationSettings.recurringType}
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
            setRotationSettings({ ...rotationSettings, recurringType: value })
          }
        >
          <SelectTrigger className="mt-1 w-full h-11 text-base sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Label className="text-sm font-medium">Interval</Label>
        <Select
          value={rotationSettings.recurringInterval.toString()}
          onValueChange={(value) =>
            setRotationSettings({
              ...rotationSettings,
              recurringInterval: parseInt(value),
            })
          }
        >
          <SelectTrigger className="mt-1 w-full h-11 text-base sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              {getIntervalLabel(1, rotationSettings.recurringType)}
            </SelectItem>
            <SelectItem value="2">
              {getIntervalLabel(2, rotationSettings.recurringType)}
            </SelectItem>
            <SelectItem value="3">
              {getIntervalLabel(3, rotationSettings.recurringType)}
            </SelectItem>
            <SelectItem value="4">
              {getIntervalLabel(4, rotationSettings.recurringType)}
            </SelectItem>
          </SelectContent>
        </Select>
      </motion.div>
    </div>
  );
}
