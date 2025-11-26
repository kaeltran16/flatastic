import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import {
    formatDateRelatively,
    getChoreRecurringTypeColor,
    getChoreStatusColor,
} from '@/utils';
import { Calendar, CheckCircle2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
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
  const canMarkComplete = chore.status === 'pending' || chore.status === 'overdue';
  const isOverdue = chore.status === 'overdue';

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      await onDeleteChore(chore.id);
      onChoreDeleted(chore.id);
    }
  };

  // Glassmorphism colors based on status
  const getGlassStyle = () => {
    if (isCompleted) {
      return 'bg-green-500/10 border-green-500/20 dark:bg-green-400/10 dark:border-green-400/20';
    }
    if (isOverdue) {
      return 'bg-red-500/10 border-red-500/20 dark:bg-red-400/10 dark:border-red-400/20';
    }
    return 'bg-orange-500/10 border-orange-500/20 dark:bg-orange-400/10 dark:border-orange-400/20';
  };

  const getAccentGlow = () => {
    if (isCompleted) return 'shadow-green-500/20';
    if (isOverdue) return 'shadow-red-500/20';
    return 'shadow-orange-500/20';
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          delay: index * 0.05, 
          duration: 0.4,
          ease: [0.4, 0.0, 0.2, 1]
        }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <div className={`
          group relative overflow-hidden rounded-2xl p-[1px]
          ${getGlassStyle()}
          backdrop-blur-xl
          border
          shadow-lg ${getAccentGlow()}
          hover:shadow-xl hover:${getAccentGlow()}
          transition-all duration-300
          ${isCompleted ? 'opacity-70' : ''}
        `}>
          {/* Glassmorphism inner content */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl p-6 sm:p-8">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <h3 className={`
                    text-xl sm:text-2xl font-bold leading-tight mb-3
                    ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}
                  `}>
                    {chore.name}
                  </h3>
                  
                  {/* Badges */}
                  <div className="flex gap-2.5 flex-wrap">
                    <Badge 
                      className={`${getChoreStatusColor(chore.status || 'pending')} backdrop-blur-sm text-sm px-3 py-1`} 
                      variant="secondary"
                    >
                      {chore.status}
                    </Badge>
                    {chore.recurring_type && chore.recurring_type !== 'none' && (
                      <Badge 
                        className={`${getChoreRecurringTypeColor(chore.recurring_type)} backdrop-blur-sm text-sm px-3 py-1`} 
                        variant="outline"
                      >
                        {chore.recurring_type}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                {showActions && !isCompleted && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5"
                        disabled={isUpdating || isDeleting}
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90">
                      <DropdownMenuItem onClick={handleEdit} className="gap-2 text-base py-2.5">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="gap-2 text-base py-2.5 text-red-600 dark:text-red-400">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Info Row */}
              <div className="flex flex-wrap items-center gap-3 text-base mb-6">
                {assignedMember && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                    <UserAvatar
                      user={assignedMember}
                      showAsYou={assignedMember.id === currentUser.id}
                    />
                  </div>
                )}

                {chore.due_date && !isCompleted && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground font-medium'}>
                      {formatDateRelatively(chore.due_date)}
                    </span>
                  </div>
                )}

                {isCompleted && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-green-500/10 dark:bg-green-400/10 backdrop-blur-sm">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      Completed {formatDateRelatively(chore.updated_at || '')}
                    </span>
                  </div>
                )}
              </div>

              {/* Complete Button */}
              {showActions && !isCompleted && canMarkComplete && onMarkComplete && (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => onMarkComplete(chore.id)}
                    className="w-full rounded-xl font-semibold text-base shadow-lg backdrop-blur-sm h-12"
                    variant="default"
                    size="lg"
                    disabled={isMarkingComplete}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {isMarkingComplete ? 'Completing...' : 'Mark Complete'}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
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
