// components/navbar/navbar.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-push-notification';
import { useProfile } from '@/hooks/use-supabase-data';
import { signOut } from '@/lib/actions/auth';
import { markNotificationAsRead } from '@/lib/actions/notification';
import {
  Calendar,
  CreditCard,
  DollarSign,
  Home,
  LucideIcon,
  Menu,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DesktopNavigation } from './desktop-nav';
import { MobileMenu } from './mobile-menu';
import { NotificationsDropdown } from './notification-dropdown';
import { UserDropdown } from './user-dropdown';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const NO_NAVBAR_PATHS = ['/auth/login', '/auth/signup', '/auth/callback'];

const navigationItems: NavigationItem[] = [
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
  const [refreshNotifications, setRefreshNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { profile, loading: profileLoading } = useProfile();
  const {
    notifications,
    loading: notificationsLoading,
    isSubscribed,
  } = useNotifications();

  console.log('notifications', notifications);

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

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/auth/login');
    } else {
      console.error('Sign out failed:', result.error);
      // You could show a toast notification here
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleNotificationClick = async (notificationId: string) => {
    const result = await markNotificationAsRead(notificationId);
    if (result.success) {
      setRefreshNotifications(!refreshNotifications);
    } else {
      console.error('Failed to mark notification as read:', result.error);
      // You could show a toast notification here
    }
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
            <DesktopNavigation
              navigationItems={navigationItems}
              pathname={pathname}
            />

            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationsDropdown
                notifications={notifications}
                loading={notificationsLoading}
                onNotificationClick={handleNotificationClick}
              />

              <UserDropdown
                profile={profile}
                onSignOut={handleSignOut}
                onProfileClick={handleProfileClick}
              />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigationItems={navigationItems}
        profile={profile}
        pathname={pathname}
      />

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16" />
    </>
  );
}
