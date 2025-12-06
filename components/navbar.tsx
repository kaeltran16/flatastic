'use client';

import { ThemeToggle } from '@/components/theme-toggle';
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
import UserAvatar from '@/components/user-avatar';
import { useProfile } from '@/hooks/use-profile';
import { useNotifications } from '@/hooks/use-push-notification';
import { navigationItems, NO_NAVBAR_PATHS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
    Bell,
    Calendar,
    CheckCheck,
    Clock,
    DollarSign,
    Home,
    Info,
    LogOut,
    Shield,
    User
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const getNotificationIconColor = (type: string | null | undefined, isUrgent: boolean | null | undefined): string => {
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

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isScrolled, setIsScrolled] = useState(false);

  const { profile, loading: profileLoading } = useProfile();

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin', profile?.id, profile?.household_id],
    queryFn: async () => {
      if (!profile?.household_id) return false;

      const supabase = createClient();
      const { data: household } = await supabase
        .from('households')
        .select('admin_id')
        .eq('id', profile.household_id)
        .single();

      return household?.admin_id === profile.id;
    },
    enabled: !!profile?.household_id,
  });

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const {
    notifications,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(profile?.id || '');

  // Don't render navbar on auth pages
  if (NO_NAVBAR_PATHS.includes(pathname)) {
    return null;
  }

  // Don't render navbar if explicitly no user (not loading and no profile)
  if (!profileLoading && !profile) {
    return null;
  }

  // Only count urgent notifications that are also unread
  const urgentNotifications = notifications.filter((n) => n.is_urgent && !n.is_read);
  const unreadNotifications = notifications.filter((n) => !n.is_read);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
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
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Top Navigation Bar - Minimal */}
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
            : 'bg-background/50 backdrop-blur-md border-b border-transparent'
        }`}
        style={{
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'blur(10px)',
          backdropFilter: isScrolled ? 'blur(20px)' : 'blur(10px)',
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            {/* Left side - Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center group">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                >
                  <Home className="h-7 w-7 text-primary" />
                </motion.div>
                <motion.span
                  className="ml-2 text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                >
                  Flatastic
                </motion.span>
              </Link>
            </div>

            {/* Center - Desktop Navigation (hidden on mobile) */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);
                return (
                  <motion.div
                    key={item.name}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={item.href}
                      className={`relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </motion.div>
                );
              })}

              {/* Admin Link - Desktop only */}
              {isAdmin && (
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    href="/admin/recurring-chores"
                    className={`relative flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActiveRoute('/admin')
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Admin Icon - Mobile only */}
              {isAdmin && (
                <motion.div
                  className="lg:hidden"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Link href="/admin/recurring-chores">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative ${
                        isActiveRoute('/admin')
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                    </Button>
                  </Link>
                </motion.div>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      <AnimatePresence mode="wait">
                        {urgentNotifications.length > 0 && (
                          <motion.div
                            key={`urgent-${urgentNotifications.length}`}
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
                              key={`unread-${unreadNotifications.length}`}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 30,
                              }}
                            >
                              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary">
                                {unreadNotifications.length}
                              </Badge>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-96" align="end" forceMount>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {unreadNotifications.length > 0
                            ? `${unreadNotifications.length} unread`
                            : 'All caught up!'}
                        </p>
                      </div>
                      {unreadNotifications.length > 0 && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await markAllAsRead();
                          }}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                        >
                          <CheckCheck className="h-3 w-3" />
                          Mark all read
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                          <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          No notifications
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You&apos;re all caught up!
                        </p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {notifications
                          .slice(0, 10)
                          .map((notification, index) => {
                            const NotificationIcon = getNotificationIcon(notification.type);
                            const iconColorClass = getNotificationIconColor(notification.type, notification.is_urgent);
                            
                            return (
                              <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <DropdownMenuItem
                                  className="p-0 cursor-pointer focus:bg-transparent"
                                  onClick={async () => {
                                    await markAsRead(notification.id);
                                  }}
                                >
                                  <div
                                    className={`w-full px-4 py-3 flex items-start gap-3 transition-all duration-200 hover:bg-accent/50 ${
                                      !notification.is_read
                                        ? 'bg-primary/5 border-l-2 border-l-primary'
                                        : ''
                                    }`}
                                  >
                                    {/* Icon */}
                                    <div
                                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        notification.is_urgent
                                          ? 'bg-red-100 dark:bg-red-500/20'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <NotificationIcon
                                        className={`h-5 w-5 ${iconColorClass}`}
                                      />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      {/* Title */}
                                      {notification.title && (
                                        <p
                                          className={`text-sm font-medium leading-tight ${
                                            notification.is_read
                                              ? 'text-muted-foreground'
                                              : 'text-foreground'
                                          }`}
                                        >
                                          {notification.title}
                                        </p>
                                      )}
                                      
                                      {/* Message */}
                                      <p
                                        className={`text-sm leading-snug mt-0.5 ${
                                          notification.is_read
                                            ? 'text-muted-foreground/70'
                                            : 'text-muted-foreground'
                                        }`}
                                      >
                                        {notification.message}
                                      </p>

                                      {/* Meta info */}
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {formatNotificationTime(
                                            notification.created_at || ''
                                          )}
                                        </span>
                                        {notification.is_urgent && (
                                          <Badge
                                            variant="destructive"
                                            className="text-[10px] h-4 px-1.5"
                                          >
                                            Urgent
                                          </Badge>
                                        )}
                                        {!notification.is_read && (
                                          <div className="w-2 h-2 rounded-full bg-primary" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              </motion.div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Footer with View All link */}
                  {notifications.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href="/notifications"
                          className="w-full text-center text-sm text-primary py-3 font-medium hover:bg-accent/50"
                        >
                          View all notifications
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                    >
                      {profile && <UserAvatar user={profile} shouldShowName={false} />}
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-14" />
    </>
  );
}
