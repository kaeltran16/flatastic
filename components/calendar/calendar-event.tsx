'use client';

import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarEvent } from '@/hooks/use-calendar-events';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, DollarSign } from 'lucide-react';

interface CalendarEventProps {
  event: CalendarEvent;
  title: string;
}

export function CalendarEventComponent({ event, title }: CalendarEventProps) {
  const isChore = event.type === 'chore';
  const Icon = isChore ? CalendarIcon : DollarSign;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium truncate w-full h-full transition-opacity hover:opacity-90',
              isChore ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
              event.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              event.status === 'settled' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
              event.status === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            )}
          >
            <Icon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {event.type}
              </Badge>
              <Badge
                variant={
                  event.status === 'overdue'
                    ? 'destructive'
                    : event.status === 'completed' || event.status === 'settled'
                    ? 'default' // Changed from 'success' to 'default' as 'success' might not exist in standard shadcn badge
                    : 'secondary'
                }
                className={
                   (event.status === 'completed' || event.status === 'settled') ? 'bg-green-500 hover:bg-green-600 border-transparent' : ''
                }
              >
                {event.status}
              </Badge>
            </div>
            {isChore && (
              <p className="text-xs">
                Assigned to: {(event.resource as any).assignee?.full_name || 'Unassigned'}
              </p>
            )}
            {!isChore && (
              <p className="text-xs">
                Paid by: {(event.resource as any).payer?.full_name || 'Unknown'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
