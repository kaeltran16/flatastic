'use client';

import { CalendarEventDialog } from '@/components/calendar/calendar-event-dialog';
import { EventCard } from '@/components/calendar/event-card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CalendarEvent, useCalendarEvents } from '@/hooks/use-calendar-events';
import {
    addMonths,
    endOfMonth,
    format,
    isToday,
    isTomorrow,
    startOfMonth,
    subMonths,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { events, isLoading } = useCalendarEvents();

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  // Get events for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const monthEvents = filteredEvents.filter((event) => {
    const eventDate = new Date(event.start);
    return eventDate >= monthStart && eventDate <= monthEnd;
  });

  // Group events by date
  const groupedEvents = monthEvents.reduce((acc, event) => {
    const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all your chores and expenses
          </p>
        </motion.div>

        {/* Navigation & Filter */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-9 w-9 rounded-xl"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9 rounded-xl"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="rounded-xl font-medium"
            >
              Today
            </Button>
            <div className="hidden sm:block h-6 w-px bg-border mx-2" />
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px] h-9 rounded-xl">
              <SelectValue placeholder="Filter events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="chore">Chores Only</SelectItem>
              <SelectItem value="expense">Expenses Only</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Events List */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No events this month</p>
              <p className="text-sm mt-1">
                {filter !== 'all'
                  ? 'Try changing the filter to see more events'
                  : 'Add some chores or expenses to see them here'}
              </p>
            </div>
          ) : (
            sortedDates.map((dateStr) => (
              <div key={dateStr} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {getDateLabel(dateStr)}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {groupedEvents[dateStr].length} event
                    {groupedEvents[dateStr].length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Event Cards */}
                <div className="space-y-3">
                  {groupedEvents[dateStr].map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleSelectEvent(event)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>

      <CalendarEventDialog
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
