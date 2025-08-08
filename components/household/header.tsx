'use client';

import { motion } from 'motion/react';
import { slideInLeft } from './animations';

export function HouseholdHeader() {
  return (
    <motion.div
      className="mb-6 sm:mb-8"
      variants={slideInLeft}
      initial="initial"
      animate="animate"
    >
      <motion.h1
        className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        Household Management
      </motion.h1>
      <motion.p
        className="text-muted-foreground mt-1 text-sm sm:text-base"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        Manage your household members and settings
      </motion.p>
    </motion.div>
  );
}
