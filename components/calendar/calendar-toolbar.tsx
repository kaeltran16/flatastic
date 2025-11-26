'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolbarProps } from 'react-big-calendar';

interface CustomToolbarProps extends ToolbarProps<any, any> {
  onFilterChange: (value: string) => void;
  filterValue: string;
}

export function CalendarToolbar({
  date,
  onNavigate,
  onView,
  view,
  label,
  onFilterChange,
  filterValue,
}: CustomToolbarProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('PREV')}
              className="h-9 w-9 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('NEXT')}
              className="h-9 w-9 rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('TODAY')}
              className="rounded-xl font-medium"
            >
              Today
            </Button>
          </div>
          <div className="hidden sm:block h-6 w-px bg-border" />
          <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        </div>

        {/* View Switcher - Desktop */}
        <div className="hidden md:flex bg-muted rounded-xl p-1">
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onView('month')}
            className="rounded-lg font-medium"
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onView('week')}
            className="rounded-lg font-medium"
          >
            Week
          </Button>
          <Button
            variant={view === 'agenda' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onView('agenda')}
            className="rounded-lg font-medium"
          >
            Agenda
          </Button>
        </div>
      </div>

      {/* Filter and Mobile View Switcher */}
      <div className="flex items-center justify-between gap-2">
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[150px] h-9 rounded-xl">
            <SelectValue placeholder="Filter events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="chore">Chores Only</SelectItem>
            <SelectItem value="expense">Expenses Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile View Switcher */}
        <div className="md:hidden">
          <Select value={view} onValueChange={(v) => onView(v as any)}>
            <SelectTrigger className="w-[110px] h-9 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
