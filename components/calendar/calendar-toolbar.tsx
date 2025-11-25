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
    <div className="flex flex-col gap-4 mb-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('PREV')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate('NEXT')}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
            className="text-xs"
          >
            Today
          </Button>
          <h2 className="text-lg font-semibold ml-2">{label}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex bg-muted rounded-lg p-1">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('month')}
              className="text-xs h-7"
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('week')}
              className="text-xs h-7"
            >
              Week
            </Button>
            <Button
              variant={view === 'agenda' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onView('agenda')}
              className="text-xs h-7"
            >
              Agenda
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Select value={filterValue} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="chore">Chores Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile View Switcher */}
        <div className="md:hidden">
          <Select value={view} onValueChange={(v) => onView(v as any)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
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
