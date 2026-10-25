'use client';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import {
    formatDateRelatively,
    getChoreRecurringTypeColor,
    getChoreStatusColor,
} from '@/utils';
import { Calendar, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import ChoreDialog from './chore-dialog';

interface ChoreListItemProps {
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

export default function ChoreListItem({
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
}: ChoreListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const assignedMember = chore.assigned_to
    ? householdMembers.find((member) => member.id === chore.assigned_to)
    : null;

  const isCompleted = chore.status === 'completed';
  const canMarkComplete = chore.status === 'pending' || chore.status === 'overdue';
  const isOverdue = chore.status === 'overdue';

  const handleCheckboxChange = async (checked: boolean) => {
    if (checked && canMarkComplete && onMarkComplete) {
      await onMarkComplete(chore.id);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      await onDeleteChore(chore.id);
      onChoreDeleted(chore.id);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className={`
          group relative border-b border-border/50 last:border-b-0
          ${isOverdue ? 'bg-red-50/30 dark:bg-red-950/20' : ''}
          ${isCompleted ? 'bg-muted/30' : 'hover:bg-muted/50'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-3 p-3 sm:p-4">
          {/* Checkbox */}
          {showActions && !isCompleted && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleCheckboxChange}
              disabled={isMarkingComplete || !canMarkComplete}
              className="h-5 w-5 shrink-0"
            />
          )}
          {isCompleted && (
            <div className="h-5 w-5 shrink-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className={`font-medium text-sm sm:text-base ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {chore.name}
              </h3>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
            
            {/* Meta info */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {assignedMember && (
                <span className="flex items-center gap-1">
                  {assignedMember.id === currentUser.id ? 'You' : assignedMember.full_name?.split(' ')[0]}
                </span>
              )}
              {chore.due_date && !isCompleted && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  <Calendar className="h-3 w-3" />
                  {isOverdue ? 'Overdue' : formatDateRelatively(chore.due_date)}
                </span>
              )}
              {isCompleted && (
                <span className="text-green-600">
                  ✓ {formatDateRelatively(chore.updated_at || '')}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions (visible on hover on desktop) */}
          {showActions && !isCompleted && (
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditDialogOpen(true);
                }}
                className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950 text-blue-600"
                disabled={isUpdating || isDeleting}
              >
                <Pencil className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                disabled={isUpdating || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 bg-muted/30 px-3 sm:px-4 py-3"
          >
            <div className="space-y-2 text-sm">
              {/* Badges */}
              <div className="flex gap-2">
                <Badge className={getChoreStatusColor(chore.status || 'pending')}>
                  {chore.status}
                </Badge>
                {chore.recurring_type && chore.recurring_type !== 'none' && (
                  <Badge className={getChoreRecurringTypeColor(chore.recurring_type)}>
                    {chore.recurring_type}
                  </Badge>
                )}
              </div>

              {/* Mobile Actions */}
              {showActions && !isCompleted && (
                <div className="flex gap-2 sm:hidden pt-2">
                  <button
                    onClick={() => setIsEditDialogOpen(true)}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 text-sm font-medium"
                    disabled={isUpdating || isDeleting}
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 text-sm font-medium"
                    disabled={isUpdating || isDeleting}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <ChoreDialog
          mode="edit"
          currentUser={currentUser}
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
