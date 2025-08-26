import EditChoreButton from '@/components/chore/edit-chore-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import ActionCard from '../action-card';
import ChoreDialog from './chore-dialog';
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
  onUpdateChore: (choreId: string, updateData: ChoreFormData) => Promise<void>;
  onDeleteChore: (choreId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isMarkingComplete: boolean;
}

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
  isUpdating,
  isDeleting,
  isMarkingComplete,
}: ChoreCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    await onDeleteChore(chore.id);
    onChoreDeleted(chore.id);
  };

  const cardClassName = `${isOverdue ? 'border-red-200 bg-red-50/30' : ''} ${
    isCompleted ? 'opacity-75 bg-green-50/30' : ''
  }`;

  return (
    <>
      <ActionCard
        onEdit={showActions && !isCompleted ? handleEdit : undefined}
        onDelete={showActions && !isCompleted ? handleDelete : undefined}
        canEdit={!isUpdating && !isDeleting}
        canDelete={!isUpdating && !isDeleting}
        editLabel="Edit Chore"
        deleteLabel="Delete Chore"
        isLoading={isUpdating || isDeleting || isMarkingComplete}
        className={cardClassName}
        contentClassName="p-3 sm:p-6"
        index={index}
      >
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

                {/* Status badges */}
                <div className="flex gap-2 flex-shrink-0">
                  <Badge variant={getStatusColor(chore.status || 'pending')}>
                    {chore.status}
                  </Badge>
                  {chore.recurring_type && chore.recurring_type !== 'none' && (
                    <Badge variant="outline">{chore.recurring_type}</Badge>
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
            </div>
          </div>

          {/* Assignment and Date Info */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pl-8 sm:pl-0 text-sm text-muted-foreground">
            {assignedMember && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage
                    src={assignedMember.avatar_url || '/placeholder.svg'}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(
                      assignedMember.full_name || assignedMember.email
                    )}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {assignedMember.id === currentUser.id
                    ? 'You'
                    : assignedMember.full_name}
                </span>
              </div>
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

          {/* Complete Button */}
          {showActions && !isCompleted && canMarkComplete && onMarkComplete && (
            <div className="pt-2 border-t border-border/50">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => onMarkComplete(chore.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                  disabled={isMarkingComplete}
                >
                  {isMarkingComplete ? 'Completing...' : 'Complete'}
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </ActionCard>

      {/* Edit Dialog - Use controlled mode without trigger */}
      {isEditDialogOpen && (
        <ChoreDialog
          mode="edit"
          chore={chore}
          householdMembers={householdMembers}
          onSubmit={async (formData) => {
            await onUpdateChore(chore.id, formData);
          }}
          isLoading={isUpdating}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  );
}
