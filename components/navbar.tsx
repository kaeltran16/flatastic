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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, useProfile } from '@/hooks/use-supabase-data';
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
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NO_NAVBAR_PATHS = ['/auth/login', '/auth/signup', '/auth/callback'];

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Chores', href: '/chores', icon: Calendar },
  { name: 'Expenses', href: '/expenses', icon: DollarSign },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Household', href: '/household', icon: Users },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [refreshNotifications, setRefreshNotifications] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { profile, loading: profileLoading } = useProfile();
  const { notifications, loading: notificationsLoading } = useNotifications();

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
    // Mark notification as read
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
    <nav className="border-b bg-card ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Burger Menu */}
          <div className="flex items-center space-x-4">
            {/* Burger Menu (Mobile) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center">
                    <Home className="h-6 w-6 text-primary mr-2" />
                    Flatastic
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsSheetOpen(false)}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <Home className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold">Flatastic</span>
            </Link>
          </div>

          {/* Center - Desktop Navigation (Hidden on mobile) */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.slice(0, -1).map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {urgentNotifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500">
                      {urgentNotifications.length}
                    </Badge>
                  )}
                  {unreadNotifications.length > 0 &&
                    urgentNotifications.length === 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadNotifications.length}
                      </Badge>
                    )}
                </Button>
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
                      {notifications.slice(0, 10).map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="p-0 cursor-pointer"
                          onClick={() =>
                            handleNotificationItemClick(notification.id)
                          }
                        >
                          <div className="w-full p-3 flex items-start gap-3 hover:bg-accent/50 rounded-sm">
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
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile.full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
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
    </nav>
  );
}
