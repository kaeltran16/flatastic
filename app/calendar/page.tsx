'use client';

import { CalendarEventComponent } from '@/components/calendar/calendar-event';
import { CalendarEventDialog } from '@/components/calendar/calendar-event-dialog';
import { CalendarToolbar } from '@/components/calendar/calendar-toolbar';
import { Card } from '@/components/ui/card';
import { CalendarEvent, useCalendarEvents } from '@/hooks/use-calendar-events';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css'; // Custom styles for dark mode

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { events, isLoading } = useCalendarEvents();

  // Switch to Agenda view on mobile
  useEffect(() => {
    if (isMobile) {
      setView(Views.AGENDA);
    } else {
      setView(Views.MONTH);
    }
  }, [isMobile]);

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return event.type === filter;
  });

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <Card className="flex-1 p-4 overflow-hidden flex flex-col">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={handleViewChange}
          date={date}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          components={{
            event: CalendarEventComponent,
            toolbar: (props) => (
              <CalendarToolbar
                {...props}
                filterValue={filter}
                onFilterChange={setFilter}
              />
            ),
          }}
          popup
          selectable
          className="rounded-md border"
        />
      </Card>

      <CalendarEventDialog
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
