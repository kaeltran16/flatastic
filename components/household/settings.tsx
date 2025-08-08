'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { buttonHover } from './animations';

export function HouseholdSettings() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base sm:text-lg lg:text-xl">
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent text-xs sm:text-sm h-9 sm:h-10"
          >
            <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Notification Settings</span>
          </Button>
        </motion.div>
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent text-xs sm:text-sm h-9 sm:h-10"
          >
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Privacy Settings</span>
          </Button>
        </motion.div>
        <motion.div
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent text-xs sm:text-sm h-9 sm:h-10"
          >
            <Trash2 className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Leave Household</span>
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
