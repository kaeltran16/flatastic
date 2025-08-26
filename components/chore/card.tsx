import EditChoreButton from '@/components/chore/edit-chore-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ChoreUpdateData } from '../../app/chores/page';
import UserAvatar from '../user-avatar';

interface ChoreCardProps {
  chore: Chore;
  householdMembers: Profile[];
  currentUser: Profile;
  index: number;
  showActions?: boolean;
  onMarkComplete?: (choreId: string) => void;
  onChoreUpdated: (updatedChore: Chore) => void;
  onChoreDeleted: (choreId: string) => void;
  onUpdateChore: (
    choreId: string,
    updateData: ChoreUpdateData
  ) => Promise<void>;
  onDeleteChore: (choreId: string) => Promise<void>;
}

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

export default function ChoreCard({
  chore,
  householdMembers,
  currentUser,
  index,
  showActions = true,
  onMarkComplete,
  onChoreUpdated,
  onChoreDeleted,
  onUpdateChore,
  onDeleteChore,
}: ChoreCardProps) {
  const assignedMember = chore.assigned_to
    ? householdMembers.find((member) => member.id === chore.assigned_to)
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';

    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString();
  };

  const isCompleted = chore.status === 'completed';
  const canMarkComplete =
    chore.status === 'pending' || chore.status === 'overdue';
  const isOverdue = chore.status === 'overdue';

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <Card
        className={`hover:shadow-md transition-shadow ${
          isOverdue ? 'border-red-200 bg-red-50/30' : ''
        } ${isCompleted ? 'opacity-75 bg-green-50/30' : ''}`}
      >
        <CardContent className="p-3 sm:p-6">
          {/* Main Content */}
          <div className="space-y-3">
            {/* Header with checkbox, title and status */}
            <div className="flex items-start gap-3">
              <motion.div whileTap={{ scale: 0.9 }} className="mt-0.5">
                <Checkbox
                  checked={isCompleted}
                  disabled={isCompleted}
                  className="h-5 w-5"
                  onCheckedChange={() => {
                    if (canMarkComplete && onMarkComplete) {
                      onMarkComplete(chore.id);
                    }
                  }}
                />
              </motion.div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-semibold text-base leading-tight break-words ${
                      isCompleted ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {chore.name}
                  </h3>

                  {/* Status badges - same row layout */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant={getStatusColor(chore.status || 'pending')}>
                      {chore.status}
                    </Badge>
                    {chore.recurring_type &&
                      chore.recurring_type !== 'none' && (
                        <Badge variant="outline">{chore.recurring_type}</Badge>
                      )}
                  </div>
                </div>

                {/* Description */}
                {chore.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {chore.description}
                  </p>
                )}
              </div>
            </div>

            {/* Assignment and Date Info */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pl-8 sm:pl-0 text-sm text-muted-foreground">
              {assignedMember && (
                <UserAvatar
                  user={assignedMember}
                  showAsYou={assignedMember.id === currentUser.id}
                />
              )}

              {chore.due_date && !isCompleted && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                    {isOverdue ? 'Was due ' : 'Due '}
                    {formatDate(chore.due_date)}
                  </span>
                </div>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <span className="text-green-700">
                    Completed {formatDate(chore.updated_at || '')}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons - Better mobile layout */}
            {showActions && !isCompleted && (
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <EditChoreButton
                  onChoreUpdated={onChoreUpdated}
                  onChoreDeleted={onChoreDeleted}
                  onUpdateChore={onUpdateChore}
                  onDeleteChore={onDeleteChore}
                  chore={chore}
                  currentUserId={currentUser.id}
                  householdMembers={householdMembers}
                  size="sm"
                  className="flex-1 sm:flex-none"
                />
                {canMarkComplete && onMarkComplete && (
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      size="sm"
                      onClick={() => onMarkComplete(chore.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      Complete
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
