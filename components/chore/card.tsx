import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import {
  formatDateRelatively,
  getChoreRecurringTypeColor,
  getChoreStatusColor,
} from '@/utils';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import ActionCard from '../action-card';
import UserAvatar from '../user-avatar';
import ChoreDialog from './chore-dialog';

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
        <div className="space-y-4 p-4">
          {/* Header with checkbox, title and status */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col items-start justify-between gap-2">
                <h3
                  className={`font-semibold text-base leading-tight break-words ${
                    isCompleted ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {chore.name}
                </h3>

                {/* Status badges */}
                <div className="flex gap-2 flex-shrink-0">
                  <Badge
                    className={`${getChoreStatusColor(
                      chore.status || 'pending'
                    )}`}
                  >
                    {chore.status}
                  </Badge>
                  {chore.recurring_type && chore.recurring_type !== 'none' && (
                    <Badge
                      className={`${getChoreRecurringTypeColor(
                        chore.recurring_type
                      )}`}
                    >
                      {chore.recurring_type}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {/* Assignment and Date Info */}
          </div>

          {/* Assignment and Date Info */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
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
                  {formatDateRelatively(chore.due_date)}
                </span>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="text-green-700">
                  Completed {formatDateRelatively(chore.updated_at || '')}
                </span>
              </div>
            )}
          </div>

          {/* Complete Button */}
          {showActions && !isCompleted && canMarkComplete && onMarkComplete && (
            <div className="pt-2">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => onMarkComplete(chore.id)}
                  className="w-full font-medium flex items-center gap-4"
                  disabled={isMarkingComplete}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isMarkingComplete ? 'Completing...' : 'Complete Task'}
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
