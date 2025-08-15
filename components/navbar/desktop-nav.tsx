// components/navbar/desktop-navigation.tsx
'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface DesktopNavigationProps {
  navigationItems: NavigationItem[];
  pathname: string;
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function DesktopNavigation({
  navigationItems,
  pathname,
}: DesktopNavigationProps) {
  return (
    <div className="hidden lg:flex items-center space-x-1">
      {navigationItems.slice(0, -1).map((item) => {
        const Icon = item.icon;
        const isActive = isActiveRoute(pathname, item.href);

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
  );
}
