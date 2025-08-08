'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Household, Profile } from '@/lib/supabase/schema.alias';
import { formatDate } from '@/utils';
import { motion } from 'motion/react';

interface QuickStatsProps {
  members: Profile[];
  household: Household;
}

export function QuickStats({ members, household }: QuickStatsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg lg:text-xl">
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 pt-0">
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-muted-foreground text-xs sm:text-sm lg:text-base">
            Total Members
          </span>
          <motion.span
            className="font-semibold text-sm sm:text-base lg:text-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.4,
              type: 'spring',
              stiffness: 200,
            }}
          >
            {members.length}
          </motion.span>
        </motion.div>
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-muted-foreground text-xs sm:text-sm lg:text-base">
            Active Since
          </span>
          <span className="font-semibold text-xs sm:text-sm lg:text-base">
            {formatDate(household.created_at || '')}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
}
