// components/navbar/mobile-menu.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Home, LucideIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface Profile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navigationItems: NavigationItem[];
  profile: Profile;
  pathname: string;
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function MobileMenu({
  isOpen,
  onClose,
  navigationItems,
  profile,
  pathname,
}: MobileMenuProps) {
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
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
                    onClick={onClose}
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
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(pathname, item.href);
                  return (
                    <motion.div key={item.name} variants={staggerItem}>
                      <Link
                        href={item.href}
                        onClick={onClose}
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
  );
}
