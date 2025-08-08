'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { buttonHover, fadeInUp } from './animations';

export function NoHouseholdDisplay() {
  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center max-w-md w-full"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        <motion.h2
          className="text-xl sm:text-2xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          No Household Found
        </motion.h2>
        <motion.p
          className="text-muted-foreground mb-6 text-sm sm:text-base px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          You're not part of any household yet.
        </motion.p>
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button className="w-full sm:w-auto">Create or Join Household</Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
