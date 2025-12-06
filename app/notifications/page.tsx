'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfile } from '@/hooks/use-profile';
import { useNotifications } from '@/hooks/use-push-notification';
import type { LucideIcon } from 'lucide-react';
import {
    AlertCircle,
    Bell,
    Calendar,
    CheckCheck,
    Clock,
    DollarSign,
    Info
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

// Helper functions for notification icons
const getNotificationIcon = (type: string | null | undefined): LucideIcon => {
  switch (type) {
    case 'chore_reminder':
      return Calendar;
    case 'expense_added':
    case 'payment_due':
      return DollarSign;
    case 'system':
      return Info;
    default:
      return Bell;
  }
};

const getNotificationIconColor = (
  type: string | null | undefined,
  isUrgent: boolean | null | undefined
): string => {
  if (isUrgent) return 'text-red-500';
  switch (type) {
    case 'chore_reminder':
      return 'text-orange-500';
    case 'expense_added':
      return 'text-emerald-500';
    case 'payment_due':
      return 'text-blue-500';
    case 'system':
      return 'text-muted-foreground';
    default:
      return 'text-primary';
  }
};

const formatNotificationTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const { profile, loading: profileLoading } = useProfile();
  const {
    notifications,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(profile?.id || '');

  const [activeTab, setActiveTab] = useState('all');

  // Categorize notifications
  const categorizedNotifications = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read);
    const urgent = notifications.filter((n) => n.is_urgent);
    const read = notifications.filter((n) => n.is_read);

    return { all: notifications, unread, urgent, read };
  }, [notifications]);

  const displayNotifications =
    categorizedNotifications[activeTab as keyof typeof categorizedNotifications] ||
    notifications;

  const isLoading = profileLoading || notificationsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {categorizedNotifications.unread.length > 0
                  ? `You have ${categorizedNotifications.unread.length} unread notification${categorizedNotifications.unread.length === 1 ? '' : 's'}`
                  : 'You\'re all caught up!'}
              </p>
            </div>

            {categorizedNotifications.unread.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {notifications.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {categorizedNotifications.unread.length}
              </p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-500">
                {categorizedNotifications.urgent.length}
              </p>
              <p className="text-xs text-muted-foreground">Urgent</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {categorizedNotifications.read.length}
              </p>
              <p className="text-xs text-muted-foreground">Read</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs sm:text-sm">
                Unread
                {categorizedNotifications.unread.length > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {categorizedNotifications.unread.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="urgent" className="text-xs sm:text-sm">
                Urgent
                {categorizedNotifications.urgent.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {categorizedNotifications.urgent.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs sm:text-sm">
                Read
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {displayNotifications.length === 0 ? (
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <Bell className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      No {activeTab === 'all' ? '' : activeTab} notifications
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeTab === 'unread'
                        ? "You've read all your notifications!"
                        : activeTab === 'urgent'
                          ? 'No urgent notifications at the moment.'
                          : 'Notifications will appear here.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {displayNotifications.map((notification, index) => {
                      const NotificationIcon = getNotificationIcon(notification.type);
                      const iconColorClass = getNotificationIconColor(
                        notification.type,
                        notification.is_urgent
                      );

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                              !notification.is_read
                                ? 'bg-primary/5 border-l-4 border-l-primary'
                                : 'bg-card/50 backdrop-blur-sm border-border/50'
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div
                                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                    notification.is_urgent
                                      ? 'bg-red-100 dark:bg-red-500/20'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <NotificationIcon
                                    className={`h-6 w-6 ${iconColorClass}`}
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      {notification.title && (
                                        <p
                                          className={`text-sm font-semibold ${
                                            notification.is_read
                                              ? 'text-muted-foreground'
                                              : 'text-foreground'
                                          }`}
                                        >
                                          {notification.title}
                                        </p>
                                      )}
                                      <p
                                        className={`text-sm mt-0.5 ${
                                          notification.is_read
                                            ? 'text-muted-foreground/70'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {notification.message}
                                      </p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                      {notification.is_urgent && (
                                        <Badge
                                          variant="destructive"
                                          className="text-[10px] h-5"
                                        >
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Urgent
                                        </Badge>
                                      )}
                                      {!notification.is_read && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Meta */}
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatNotificationTime(
                                        notification.created_at || ''
                                      )}
                                    </span>
                                    {notification.type && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 capitalize"
                                      >
                                        {notification.type.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
