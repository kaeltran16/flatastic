'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { updateUserAvailability } from '@/lib/actions/household';
import {
  Calendar,
  CheckCircle2,
  Info,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

const memberItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
      ease: 'easeOut' as const,
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 },
  },
};

const statusIconVariants = {
  available: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut' as const,
    },
  },
  unavailable: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
      ease: 'easeInOut' as const,
    },
  },
};

interface Member {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  is_available: boolean | null;
}

interface AvailabilitySectionProps {
  userId: string;
  currentUserAvailability: boolean;
  isAdmin: boolean;
  members: Member[];
  onAvailabilityChange?: () => void;
}

export function AvailabilitySection({
  userId,
  currentUserAvailability,
  isAdmin,
  members,
  onAvailabilityChange,
}: AvailabilitySectionProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [localAvailability, setLocalAvailability] = useState<
    Record<string, boolean>
  >({});

  // Initialize and update local state when props change
  useEffect(() => {
    const newAvailability: Record<string, boolean> = {
      [userId]: currentUserAvailability,
    };
    members.forEach((member) => {
      newAvailability[member.id] = member.is_available ?? true;
    });
    setLocalAvailability(newAvailability);
  }, [userId, currentUserAvailability, members]); // Depend on full members array to catch availability changes

  const handleToggle = async (
    targetUserId: string,
    newAvailability: boolean
  ) => {
    // Optimistically update UI
    setLocalAvailability((prev) => ({
      ...prev,
      [targetUserId]: newAvailability,
    }));
    setLoadingStates((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const result = await updateUserAvailability(
        targetUserId,
        newAvailability,
        isAdmin
      );

      if (!result.success) {
        // Revert on error
        setLocalAvailability((prev) => ({
          ...prev,
          [targetUserId]: !newAvailability,
        }));
        toast.error(result.error || 'Failed to update availability');
        return;
      }

      const targetMember = members.find((m) => m.id === targetUserId);
      const memberName =
        targetMember?.full_name || targetMember?.email || 'Member';
      const isCurrentUser = targetUserId === userId;

      toast.success(
        isCurrentUser
          ? newAvailability
            ? 'You are now available for chore assignments'
            : 'You are now unavailable for chore assignments'
          : newAvailability
          ? `${memberName} is now available for chore assignments`
          : `${memberName} is now unavailable for chore assignments`
      );

      // Refresh data from server
      onAvailabilityChange?.();
    } catch (error) {
      // Revert on error
      setLocalAvailability((prev) => ({
        ...prev,
        [targetUserId]: !newAvailability,
      }));
      toast.error('Failed to update availability');
      console.error(error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const availableCount = members.filter(
    (m) => localAvailability[m.id] ?? m.is_available ?? true
  ).length;
  const totalCount = members.length;
  const currentUserLocalAvailability =
    localAvailability[userId] ?? currentUserAvailability;

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Availability
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isAdmin
                  ? 'Manage member availability'
                  : 'Control your chore assignments'}
              </CardDescription>
            </div>
            <motion.div
              className="flex items-center gap-2 self-start sm:self-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {availableCount}/{totalCount} available
              </span>
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Current User Toggle (Always shown first) */}
          <motion.div
            className="p-3 sm:p-4 bg-primary/5 border-2 border-primary/20 rounded-lg"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <motion.div
                  key={
                    currentUserLocalAvailability ? 'available' : 'unavailable'
                  }
                  variants={statusIconVariants}
                  initial="hidden"
                  animate={
                    currentUserLocalAvailability ? 'available' : 'unavailable'
                  }
                >
                  {currentUserLocalAvailability ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`availability-${userId}`}
                    className="text-sm sm:text-base font-medium cursor-pointer block"
                  >
                    Your Availability
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {currentUserLocalAvailability
                      ? 'In rotation'
                      : 'Not receiving new chores'}
                  </p>
                </div>
              </div>
              <Switch
                id={`availability-${userId}`}
                checked={currentUserLocalAvailability}
                onCheckedChange={(checked) => handleToggle(userId, checked)}
                disabled={loadingStates[userId]}
                className="flex-shrink-0"
              />
            </div>
          </motion.div>

          {/* Admin Controls for Other Members */}
          {isAdmin && members.length > 1 && (
            <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
              <motion.div
                className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground px-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Manage Members</span>
              </motion.div>

              <AnimatePresence mode="popLayout">
                {members
                  .filter((member) => member.id !== userId)
                  .map((member, index) => {
                    const isAvailable =
                      localAvailability[member.id] ??
                      member.is_available ??
                      true;
                    const displayName = member.full_name || member.email;
                    const initials = member.full_name
                      ? member.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : member.email[0].toUpperCase();

                    return (
                      <motion.div
                        key={member.id}
                        custom={index}
                        variants={memberItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted/70 active:bg-muted/80 transition-colors touch-manipulation"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] sm:text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {displayName}
                              </p>
                              <motion.div
                                key={`${member.id}-${isAvailable}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 30,
                                }}
                              >
                                {isAvailable ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                                )}
                              </motion.div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </p>
                          </div>

                          <Switch
                            id={`availability-${member.id}`}
                            checked={isAvailable}
                            onCheckedChange={(checked) =>
                              handleToggle(member.id, checked)
                            }
                            disabled={loadingStates[member.id]}
                            className="flex-shrink-0"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}

          {/* Info Box */}
          <motion.div
            className="flex gap-2 p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-[10px] sm:text-xs text-blue-900 dark:text-blue-100 space-y-1">
              <p>
                Unavailable members are skipped in rotation and won't receive
                new chores.
              </p>
              {isAdmin && (
                <p className="font-medium">
                  You can manage all member availability.
                </p>
              )}
            </div>
          </motion.div>

          {/* Warning if no one is available */}
          <AnimatePresence>
            {availableCount === 0 && (
              <motion.div
                className="flex gap-2 p-2.5 sm:p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-orange-900 dark:text-orange-100">
                  <span className="font-semibold">Warning:</span> No members
                  available. Chore assignments will fail until someone is marked
                  available.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
