'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useNotifications } from '@/hooks/use-push-notification';
import { useProfile } from '@/hooks/use-supabase-data';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  Bell,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Home,
  LogOut,
  Menu,
  User,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserAvatar from './user-avatar';

const NO_NAVBAR_PATHS = ['/auth/login', '/auth/signup', '/auth/callback'];

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Chores', href: '/chores', icon: Calendar },
  { name: 'Expenses', href: '/expenses', icon: DollarSign },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Household', href: '/household', icon: Users },
  { name: 'PWA NextJS', href: '/pwa-nextjs', icon: Users },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [refreshNotifications, setRefreshNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { profile, loading: profileLoading } = useProfile();
  const {
    notifications,
    loading: notificationsLoading,
    isSubscribed,
  } = useNotifications();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Don't render navbar on auth pages or if no profile
  if (!profile || NO_NAVBAR_PATHS.includes(pathname)) {
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

  const navbarVariants = {
    scrolled: {
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.3 },
    },
    top: {
      backdropFilter: 'blur(0px)',
      backgroundColor: 'rgba(255, 255, 255, 1)',
      borderBottomColor: 'rgba(0, 0, 0, 0.05)',
      transition: { duration: 0.3 },
    },
  };

  const mobileMenuVariants = {
    hidden: {
      x: '-100%',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
    visible: {
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const staggerItem = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-md transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : 'shadow-sm'
        }`}
        variants={navbarVariants}
        animate={isScrolled ? 'scrolled' : 'top'}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and Burger Menu */}
            <div className="flex items-center space-x-4">
              {/* Burger Menu (Mobile) */}
              <motion.div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="relative"
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                </Button>
              </motion.div>

              {/* Logo */}
              <Link href="/dashboard" className="flex items-center group">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                >
                  <Home className="h-8 w-8 text-primary" />
                </motion.div>
                <motion.span
                  className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                >
                  Flatastic
                </motion.span>
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigationItems.slice(0, -1).map((item, index) => {
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
                      className={`relative flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 bg-primary rounded-xl -z-10"
                          layoutId="activeTab"
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
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
                      className="relative h-10 w-10 rounded-full"
                    >
                      {/* <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                          {profile.full_name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('') || 'U'}
                        </AvatarFallback>
                      </Avatar> */}
                      <UserAvatar user={profile} shouldShowName={false} />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile.email}
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

      {/* Mobile Menu Overlay and Content */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <motion.div
              className="fixed top-0 left-0 h-full w-80 bg-background border-r shadow-2xl z-50 lg:hidden"
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6, type: 'spring' }}
                    >
                      <Home className="h-8 w-8 text-primary" />
                    </motion.div>
                    <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Flatastic
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="rounded-full"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>

                {/* Navigation Items */}
                <motion.div
                  className="flex-1 p-6 space-y-2"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <motion.div key={item.name} variants={staggerItem}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-lg'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          }`}
                        >
                          <Icon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                          {item.name}
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* User Info */}
                <motion.div
                  className="p-6 border-t bg-accent/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {profile.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile.full_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16" />
    </>
  );
}
