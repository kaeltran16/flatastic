'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { buttonHover, scaleIn } from './animations';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center max-w-sm w-full"
        variants={scaleIn}
        initial="initial"
        animate="animate"
      >
        <motion.div
          className="text-red-600 mb-4 text-sm sm:text-base px-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Error: {error}
        </motion.div>
        <motion.div variants={buttonHover} whileHover="hover" whileTap="tap">
          <Button
            onClick={onRetry || (() => window.location.reload())}
            className="w-full sm:w-auto"
          >
            Retry
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
