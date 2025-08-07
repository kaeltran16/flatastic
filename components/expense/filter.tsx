import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('all');
  const [statusValue, setStatusValue] = useState('all');

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onSearchChange?.(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryValue(value);
    onCategoryChange?.(value);
  };

  const handleStatusChange = (value: string) => {
    setStatusValue(value);
    onStatusChange?.(value);
  };

  const clearAllFilters = () => {
    setSearchValue('');
    setCategoryValue('all');
    setStatusValue('all');
    onSearchChange?.('');
    onCategoryChange?.('all');
    onStatusChange?.('all');
  };

  const hasActiveFilters =
    searchValue || categoryValue !== 'all' || statusValue !== 'all';

  return (
    <div className="space-y-4">
      {/* Search bar - always visible on mobile */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10 h-11 text-base"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => handleSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Mobile filter toggle + desktop filters */}
      <div className="flex items-center justify-between gap-3">
        {/* Mobile filter button */}
        <div className="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="h-10 px-4"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <div className="ml-2 h-2 w-2 bg-primary rounded-full" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-10 px-3 text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Desktop filters - always visible */}
        <div className="hidden sm:flex items-center gap-4 flex-1">
          <Select value={categoryValue} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="groceries">🛒 Groceries</SelectItem>
              <SelectItem value="utilities">⚡ Utilities</SelectItem>
              <SelectItem value="household">🏠 Household</SelectItem>
              <SelectItem value="food">🍕 Food</SelectItem>
              <SelectItem value="transportation">🚗 Transport</SelectItem>
              <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusValue} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">⏳ Pending</SelectItem>
              <SelectItem value="settled">✅ Settled</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-10 px-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Mobile collapsible filters */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden sm:hidden"
          >
            <div className="space-y-3 pt-2">
              <Select
                value={categoryValue}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="groceries">🛒 Groceries</SelectItem>
                  <SelectItem value="utilities">⚡ Utilities</SelectItem>
                  <SelectItem value="household">🏠 Household</SelectItem>
                  <SelectItem value="food">🍕 Food</SelectItem>
                  <SelectItem value="transportation">
                    🚗 Transportation
                  </SelectItem>
                  <SelectItem value="entertainment">
                    🎬 Entertainment
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusValue} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="settled">✅ Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
