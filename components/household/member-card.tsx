'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Household, Profile } from '@/lib/supabase/schema.alias';
import { formatDate } from '@/utils';
import { Calendar, Edit, Mail, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import UserAvatar from '../user-avatar';
import { buttonHover, memberVariants } from './animations';

interface MemberCardProps {
  member: Profile;
  currentUserId: string;
  household: Household;
  index: number;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export function MemberCard({
  member,
  currentUserId,
  household,
  index,
  onRemoveMember,
}: MemberCardProps) {
  const isCurrentUser = member.id === currentUserId;
  const isCurrentUserAdmin = household?.admin_id === currentUserId;

  // Show delete button only if:
  // 1. Current user is the admin, AND
  // 2. The member is not the current user (can't delete yourself)
  const canManageMember = isCurrentUserAdmin && !isCurrentUser;

  return (
    <motion.div
      layout
      variants={memberVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      transition={{ delay: index * 0.05 }}
      className="flex flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0 bg-card/50 hover:bg-card transition-colors"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: index * 0.1 + 0.3,
            type: 'spring',
            stiffness: 200,
          }}
        >
          <UserAvatar
            className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 ring-2 ring-background"
            shouldShowName={false}
            showAsYou={false}
            user={member}
          />
        </motion.div>
        <div className="min-w-0 flex-1">
          <motion.div
            className="flex items-center gap-2 flex-wrap mb-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            <h3 className="font-semibold text-sm sm:text-base truncate">
              {member.full_name}
            </h3>
            {isCurrentUser && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.1 + 0.5,
                  type: 'spring',
                }}
              >
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  You
                </Badge>
              </motion.div>
            )}
            {member.id === household?.admin_id && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: index * 0.1 + 0.5,
                  type: 'spring',
                }}
              >
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  Admin
                </Badge>
              </motion.div>
            )}
          </motion.div>
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.5 }}
          >
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">
                {member.email}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">
                Joined {formatDate(member.created_at || '')}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
      {canManageMember && (
        <motion.div
          className="flex items-center gap-2 justify-end sm:justify-start flex-shrink-0"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 + 0.6 }}
        >
          <motion.div variants={buttonHover} whileHover="hover" whileTap="tap">
            <Button variant="outline" size="sm" className="p-2">
              <Edit className="h-4 w-4" />
            </Button>
          </motion.div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.div
                variants={buttonHover}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-3 sm:mx-0 w-[calc(100vw-24px)] sm:w-auto max-w-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-base sm:text-lg">
                    Remove Member
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Are you sure you want to remove {member.full_name} from the
                    household? This action cannot be undone and they will lose
                    access to all household data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
                  <AlertDialogCancel className="w-full sm:w-auto text-sm">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm"
                    onClick={() => onRemoveMember(member.id)}
                  >
                    Remove Member
                  </AlertDialogAction>
                </AlertDialogFooter>
              </motion.div>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}
    </motion.div>
  );
}
