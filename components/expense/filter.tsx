import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExpenseFiltersProps {
  onCategoryChange?: (category: string) => void;
  onStatusChange?: (status: string) => void;
  onSearchChange?: (search: string) => void;
}

export default function ExpenseFilters({
  onCategoryChange,
  onStatusChange,
  onSearchChange,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 items-start sm:items-center">
      <Select defaultValue="all" onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="groceries">Groceries</SelectItem>
          <SelectItem value="utilities">Utilities</SelectItem>
          <SelectItem value="household">Household</SelectItem>
          <SelectItem value="food">Food</SelectItem>
          <SelectItem value="transportation">Transportation</SelectItem>
          <SelectItem value="entertainment">Entertainment</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="all" onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="settled">Settled</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Search expenses..."
        className="w-full max-w-xs"
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
    </div>
  );
}
