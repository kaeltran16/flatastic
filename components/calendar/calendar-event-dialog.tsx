'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CalendarEvent } from '@/hooks/use-calendar-events';
import { useMarkChoreComplete } from '@/hooks/use-chore';
import { format } from 'date-fns';
import { Check, ExternalLink, User } from 'lucide-react';
import Link from 'next/link';

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarEventDialog({
  event,
  open,
  onOpenChange,
}: CalendarEventDialogProps) {
  const { mutateAsync: markComplete } = useMarkChoreComplete();

  if (!event) return null;

  const isChore = event.type === 'chore';
  const resource = event.resource;

  const handleCompleteChore = async () => {
    if (!isChore) return;
    try {
      await markComplete(event.id.replace('chore-', ''));
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isChore ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-none">
                Chore
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-none">
                Expense
              </Badge>
            )}
            <span className="truncate">{event.title}</span>
          </DialogTitle>
          <DialogDescription>
            {format(event.start, 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isChore ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Assigned to</p>
                  <p className="text-sm text-muted-foreground">
                    {(resource as any).assignee?.full_name || 'Unassigned'}
                  </p>
                </div>
              </div>
              
              {(resource as any).description && (
                <div className="text-sm text-muted-foreground">
                  {(resource as any).description}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  variant={
                    event.status === 'overdue'
                      ? 'destructive'
                      : event.status === 'completed'
                      ? 'default'
                      : 'secondary'
                  }
                  className={
                     event.status === 'completed' ? 'bg-green-500 hover:bg-green-600 border-transparent' : ''
                  }
                >
                  {event.status}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Paid by</p>
                  <p className="text-sm text-muted-foreground">
                    {(resource as any).payer?.full_name || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Amount</span>
                <span className="text-lg font-bold">
                  ${(resource as any).amount?.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                   variant={event.status === 'settled' ? 'default' : 'secondary'}
                   className={event.status === 'settled' ? 'bg-green-500 hover:bg-green-600 border-transparent' : ''}
                >
                  {event.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isChore && event.status !== 'completed' && (
            <Button onClick={handleCompleteChore} className="w-full sm:w-auto">
              <Check className="mr-2 h-4 w-4" />
              Mark as Complete
            </Button>
          )}
          {!isChore && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/expenses">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Expenses
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
