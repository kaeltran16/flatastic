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
import {
    AlertCircle,
    Bell,
    Clock,
    Home,
    LogOut,
    Shield,
    User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [refreshNotifications, setRefreshNotifications] = useState(false);
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
  } = useNotifications(profile?.id || '');

  // Don't render navbar on auth pages
  if (NO_NAVBAR_PATHS.includes(pathname)) {
    return null;
  }

  // Don't render navbar if explicitly no user (not loading and no profile)
  if (!profileLoading && !profile) {
    return null;
  }

  const urgentNotifications = notifications.filter((n) => n.is_urgent);
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

  const handleNotificationClick = (notificationId?: string) => {
    setRefreshNotifications(!refreshNotifications);
    if (notificationId) {
      console.log('Notification clicked:', notificationId);
    }
  };

  const handleNotificationItemClick = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      handleNotificationClick(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
                      <p className="text-sm font-medium leading-none">
                        Notifications
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {urgentNotifications.length > 0
                          ? `${urgentNotifications.length} urgent notification${
                              urgentNotifications.length === 1 ? '' : 's'
                            }`
                          : `You have ${
                              unreadNotifications.length
                            } unread notification${
                              unreadNotifications.length === 1 ? '' : 's'
                            }`}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
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
                        {notifications
                          .slice(0, 10)
                          .map((notification, index) => (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <DropdownMenuItem
                                className="p-0 cursor-pointer"
                                onClick={() =>
                                  handleNotificationItemClick(notification.id)
                                }
                              >
                                <div className="w-full p-3 flex items-start gap-3 hover:bg-accent/50 rounded-sm transition-colors">
                                  <div className="flex-shrink-0 mt-1">
                                    {notification.is_urgent ? (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          notification.is_read
                                            ? 'bg-muted'
                                            : 'bg-blue-500'
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
