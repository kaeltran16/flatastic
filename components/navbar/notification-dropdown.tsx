// components/navbar/notifications-dropdown.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNotificationTime } from '@/lib/actions/notification';
import { Notifications } from '@/lib/supabase/schema.alias';
import { AlertCircle, Bell, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';

interface NotificationsDropdownProps {
  notifications: Notifications[];
  loading: boolean;
  onNotificationClick: (notificationId: string) => Promise<void>;
}

export function NotificationsDropdown({
  notifications,
  loading,
  onNotificationClick,
}: NotificationsDropdownProps) {
  const urgentNotifications = notifications.filter((n) => n.is_urgent);
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <AnimatePresence>
              {urgentNotifications.length > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 animate-pulse">
                    {urgentNotifications.length}
                  </Badge>
                </motion.div>
              )}
              {unreadNotifications.length > 0 &&
                urgentNotifications.length === 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  >
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {unreadNotifications.length}
                    </Badge>
                  </motion.div>
                )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Notifications</p>
            <p className="text-xs leading-none text-muted-foreground">
              {urgentNotifications.length > 0
                ? `${urgentNotifications.length} urgent notification${
                    urgentNotifications.length === 1 ? '' : 's'
                  }`
                : `You have ${unreadNotifications.length} unread notification${
                    unreadNotifications.length === 1 ? '' : 's'
                  }`}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-2 space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 10).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <DropdownMenuItem
                    className="p-0 cursor-pointer"
                    onClick={() => onNotificationClick(notification.id)}
                  >
                    <div className="w-full p-3 flex items-start gap-3 hover:bg-accent/50 rounded-sm transition-colors">
                      <div className="flex-shrink-0 mt-1">
                        {notification.is_urgent ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              notification.is_read ? 'bg-muted' : 'bg-blue-500'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? 'text-muted-foreground'
                              : 'text-foreground font-medium'
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatNotificationTime(
                              notification.created_at || ''
                            )}
                          </span>
                          {notification.is_urgent && (
                            <Badge
                              variant="destructive"
                              className="text-xs h-4"
                            >
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notifications"
                className="w-full text-center text-sm text-primary"
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
