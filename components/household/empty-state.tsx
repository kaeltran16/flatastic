'use client';

import { CreateJoinHouseholdDialog } from '@/components/household/create-join-dialog';
import { createHousehold, joinHousehold } from '@/lib/actions/household';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { buttonHover, fadeInUp } from './animations';

export function NoHouseholdDisplay() {
  const router = useRouter();

  const handleCreateHousehold = async (data: { name: string }) => {
    try {
      await createHousehold(data);
      toast.success('Household created successfully!');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create household'
      );
      throw error;
    }
  };

  const handleJoinHousehold = async (data: { inviteCode: string }) => {
    try {
      await joinHousehold(data);
      toast.success('Successfully joined household!');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to join household'
      );
      throw error;
    }
  };

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
          You're not part of any household yet. Create a new household or join
          an existing one.
        </motion.p>
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CreateJoinHouseholdDialog
            onCreateHousehold={handleCreateHousehold}
            onJoinHousehold={handleJoinHousehold}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
