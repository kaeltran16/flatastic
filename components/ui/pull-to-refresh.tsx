'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullProgress, setPullProgress] = useState(0); // 0 to 1
  
  const y = useMotionValue(0);
  // Transform y to rotation or other visual indicators
  const rotate = useTransform(y, [0, 100], [0, 180]);
  const opacity = useTransform(y, [0, 50], [0, 1]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (window.scrollY === 0 && diff > 0 && !isRefreshing) {
        // Prevent default only if we are actually pulling to refresh to avoid interfering with normal scroll
        // But we must be careful not to block scrolling unnecessarily.
        // Usually better to not prevent default unless we are sure.
        
        // Damping the pull
        const damped = Math.min(diff * 0.5, 150); 
        y.set(damped);
        setPullProgress(Math.min(damped / 100, 1));
        
        if (damped > 0) {
             // e.preventDefault(); // This is often problematic for passive listeners
        }
      }
    };

    const handleTouchEnd = async () => {
      const currentPull = y.get();
      if (currentPull > 80 && !isRefreshing) {
        setIsRefreshing(true);
        // Animate to loading position
        animate(y, 60, { type: "spring", stiffness: 300, damping: 30 });
        
        try {
          // Trigger refresh
          await Promise.all([
             queryClient.invalidateQueries(),
             router.refresh()
          ]);
           // Simulate a minimum delay for UX
           await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
          setIsRefreshing(false);
          // Animate back to 0
          animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
      } else {
        // Snap back
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
      setPullProgress(0);
      setStartY(0);
    };

    // Attach to window or a specific container?
    // Attaching to window handles the global scroll behavior better for "all pages"
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, startY, router, queryClient, y]);

  return (
    <div className="relative min-h-screen">
      <motion.div
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none"
        style={{ y, opacity }}
      >
        <div className="bg-background/80 backdrop-blur-md border shadow-md rounded-full p-2">
            <AnimatePresence mode="wait">
                {isRefreshing ? (
                    <motion.div
                        key="loading"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                        <Loader2 className="w-5 h-5 text-primary" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="arrow"
                        style={{ rotate }}
                    >
                         <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-primary"
                          >
                            <path d="M3 12a9 9 0 1 1 2.9 6.4" />
                            <path d="M21 12v9" />
                            <path d="M12 21l9-9" />
                          </svg>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </motion.div>
      
      <motion.div
        style={{ y }}
      >
        {children}
      </motion.div>
    </div>
  );
}
