'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Household, Profile } from '@/lib/supabase/schema.alias';
import { Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { staggerContainer } from './animations';
import { MemberCard } from './member-card';

interface MembersListProps {
  members: Profile[];
  currentUserId: string;
  household: Household;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function MembersList({
  members,
  currentUserId,
  household,
  onRemoveMember,
}: MembersListProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
          >
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </motion.div>
          Household Members ({members.length})
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Manage who has access to your household
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <motion.div
          className="space-y-3 sm:space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence mode="popLayout">
            {members.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                household={household}
                index={index}
                onRemoveMember={onRemoveMember}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
}
