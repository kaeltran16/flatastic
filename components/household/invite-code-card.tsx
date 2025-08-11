'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Household } from '@/lib/supabase/schema.alias';
import { motion } from 'motion/react';
import { buttonHover } from './animations';

interface InviteCodeCardProps {
  household: Household;
}

export function InviteCodeCard({ household }: InviteCodeCardProps) {
  const copyInviteCode = () => {
    if (household.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      // TODO: Show toast notification
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg lg:text-xl">
          Invite Code
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Share this code for quick invites
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Input
              value={household.invite_code || ''}
              readOnly
              className="text-xs sm:text-sm font-mono"
            />
            <motion.div
              variants={buttonHover}
              whileHover="hover"
              whileTap="tap"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={copyInviteCode}
                className="text-xs whitespace-nowrap px-2 sm:px-3"
              >
                Copy
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            variants={buttonHover}
            whileHover="hover"
            whileTap="tap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          ></motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
