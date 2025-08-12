import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Car,
  CheckCircle2,
  Clock,
  Film,
  Home,
  Pizza,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface ExpenseFiltersProps {
  onCategoryChange?: (category: string) => void;
  onStatusChange?: (status: string) => void;
  onSearchChange?: (search: string) => void;
}

const categories = [
  { value: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { value: 'utilities', label: 'Utilities', icon: Zap },
  { value: 'household', label: 'Household', icon: Home },
  { value: 'food', label: 'Food & Dining', icon: Pizza },
  { value: 'transportation', label: 'Transport', icon: Car },
  { value: 'entertainment', label: 'Entertainment', icon: Film },
];

const statuses = [
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'settled', label: 'Settled', icon: CheckCircle2 },
];

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
    setIsFiltersOpen(false);
  };

  const clearSearch = () => {
    setSearchValue('');
    onSearchChange?.('');
  };

  const clearCategory = () => {
    setCategoryValue('all');
    onCategoryChange?.('all');
  };

  const clearStatus = () => {
    setStatusValue('all');
    onStatusChange?.('all');
  };

  const hasActiveFilters =
    searchValue || categoryValue !== 'all' || statusValue !== 'all';

  const selectedCategory = categories.find(
    (cat) => cat.value === categoryValue
  );
  const selectedStatus = statuses.find(
    (status) => status.value === statusValue
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10 h-12 text-base border-2 focus:border-primary/50 transition-colors"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted/50"
            onClick={clearSearch}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Mobile Filter Toggle */}
        <div className="sm:hidden">
          <Button
            variant={hasActiveFilters ? 'default' : 'outline'}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full h-11 justify-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-auto bg-background/20 text-current text-xs px-1.5 py-0.5 h-5"
              >
                {
                  [
                    searchValue && 1,
                    categoryValue !== 'all' && 1,
                    statusValue !== 'all' && 1,
                  ].filter(Boolean).length
                }
              </Badge>
            )}
          </Button>
        </div>

        {/* Desktop Filters */}
        <div className="hidden sm:flex items-center gap-3 flex-1">
          <Select value={categoryValue} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px] h-11 border-2 focus:border-primary/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <SelectItem key={category.value} value={category.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {category.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={statusValue} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px] h-11 border-2 focus:border-primary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((status) => {
                const Icon = status.icon;
                return (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {status.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="h-11 px-4 text-muted-foreground hover:text-foreground border-2 border-transparent hover:border-muted/50"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden sm:hidden bg-muted/30 rounded-lg border"
          >
            <div className="p-4 space-y-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Category
                  </label>
                  {categoryValue !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCategory}
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Select
                  value={categoryValue}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <SelectItem key={category.value} value={category.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {category.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Status
                  </label>
                  {statusValue !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearStatus}
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Select value={statusValue} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statuses.map((status) => {
                      const Icon = status.icon;
                      return (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {status.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear All Button */}
              {hasActiveFilters && (
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="w-full h-10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {searchValue && (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm flex items-center gap-2 bg-primary/10 text-primary border-primary/20"
            >
              <Search className="h-3 w-3" />
              <span className="truncate max-w-[100px]">"{searchValue}"</span>
              <button
                onClick={clearSearch}
                className="ml-1 hover:bg-primary/20 rounded p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {categoryValue !== 'all' && selectedCategory && (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
            >
              <selectedCategory.icon className="h-3 w-3" />
              {selectedCategory.label}
              <button
                onClick={clearCategory}
                className="ml-1 hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {statusValue !== 'all' && selectedStatus && (
            <Badge
              variant="secondary"
              className="px-3 py-1 text-sm flex items-center gap-2 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
            >
              <selectedStatus.icon className="h-3 w-3" />
              {selectedStatus.label}
              <button
                onClick={clearStatus}
                className="ml-1 hover:bg-green-200/50 dark:hover:bg-green-800/50 rounded p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </motion.div>
      )}
    </div>
  );
}
