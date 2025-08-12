'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Household } from '@/lib/supabase/schema.alias';
import { formatDate } from '@/utils';
import { Settings } from 'lucide-react';
import { motion } from 'motion/react';

interface HouseholdInfoProps {
  household: Household;
}

export function HouseholdInfo({ household }: HouseholdInfoProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
            <motion.div
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </motion.div>
            Household Information
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Basic information about your household
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label className="text-xs sm:text-sm font-medium text-muted-foreground">
            Name
          </Label>
          <p className="text-sm sm:text-base lg:text-lg font-semibold mt-1">
            {household.name}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Label className="text-xs sm:text-sm font-medium text-muted-foreground">
            Created
          </Label>
          <p className="text-xs sm:text-sm lg:text-base mt-1">
            {formatDate(household.created_at || '')}
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
}
