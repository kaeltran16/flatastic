import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Profile } from '@/lib/supabase/types';
import { motion } from 'motion/react';

interface ChoreFiltersProps {
  householdMembers: Profile[];
  currentUser: Profile;
  assigneeFilter: string;
  statusFilter: string;
  recurringFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onRecurringFilterChange: (value: string) => void;
}

export default function ChoreFilters({
  householdMembers,
  currentUser,
  assigneeFilter,
  statusFilter,
  recurringFilter,
  onAssigneeFilterChange,
  onStatusFilterChange,
  onRecurringFilterChange,
}: ChoreFiltersProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6"
    >
      <Select value={assigneeFilter} onValueChange={onAssigneeFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Members</SelectItem>
          {householdMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.id === currentUser.id ? 'You' : member.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={recurringFilter} onValueChange={onRecurringFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by recurring" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="none">One-time</SelectItem>
        </SelectContent>
      </Select>
    </motion.div>
  );
}
