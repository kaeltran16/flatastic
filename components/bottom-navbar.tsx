'use client';

import { bottomNavItems, moreMenuItems, NO_NAVBAR_PATHS } from '@/lib/constants';
import { MoreHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function BottomNavbar() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Don't render on auth pages
  if (NO_NAVBAR_PATHS.includes(pathname)) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isMoreActive = moreMenuItems.some((item) => isActiveRoute(item.href));

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Glassmorphism background */}
        <div className="relative">
          {/* Glass effect container */}
          <div
            className="absolute inset-0 bg-background/70 dark:bg-background/80 backdrop-blur-xl border-t border-border/50"
            style={{
              WebkitBackdropFilter: 'blur(20px)',
              backdropFilter: 'blur(20px)',
            }}
          />

          {/* Navigation items */}
          <div
            className="relative flex items-center justify-around px-2"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
              paddingTop: '8px',
            }}
          >
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 py-1 relative"
                >
                  <motion.div
                    className="flex flex-col items-center justify-center"
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                        layoutId="bottomNavIndicator"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                        color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon className="h-6 w-6" />
                    </motion.div>
                    
                    <span
                      className={`text-[10px] mt-1 font-medium transition-colors ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {item.name}
                    </span>
                  </motion.div>
                </Link>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setIsMoreOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 relative"
            >
              <motion.div
                className="flex flex-col items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                {/* Active indicator for More */}
                {isMoreActive && (
                  <motion.div
                    className="absolute -top-1 w-8 h-1 bg-primary rounded-full"
                    layoutId="bottomNavIndicator"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
                
                <motion.div
                  animate={{
                    scale: isMoreActive ? 1.1 : 1,
                    color: isMoreActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <MoreHorizontal className="h-6 w-6" />
                </motion.div>
                
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors ${
                    isMoreActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  More
                </span>
              </motion.div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* More Menu Sheet */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
            />

            {/* Bottom Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div
                className="bg-background/95 dark:bg-background/98 backdrop-blur-xl rounded-t-3xl border-t border-border/50 shadow-2xl"
                style={{
                  WebkitBackdropFilter: 'blur(20px)',
                  backdropFilter: 'blur(20px)',
                  paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
                }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pb-4">
                  <h3 className="text-lg font-semibold">More</h3>
                  <button
                    onClick={() => setIsMoreOpen(false)}
                    className="p-2 rounded-full hover:bg-accent transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Menu Items */}
                <div className="px-4 pb-4 space-y-1">
                  {moreMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);

                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-accent'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl ${
                              isActive
                                ? 'bg-primary-foreground/20'
                                : 'bg-accent'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to prevent content from hiding behind bottom nav */}
      <div
        className="lg:hidden"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        }}
      />
    </>
  );
}
