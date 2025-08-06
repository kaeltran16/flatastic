'use client';
import { ChoreUpdateData } from '@/app/chores/page';
import { Chore, Profile } from '@/lib/supabase/types';
import { Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../ui/button';
import EditChoreDialog from './edit-chore-dialog';

interface EditChoreButtonProps extends React.ComponentProps<typeof Button> {
  onChoreUpdated?: (chore: Chore) => void;
  onChoreDeleted?: (choreId: string) => void;
  onUpdateChore?: (
    choreId: string,
    updateData: ChoreUpdateData
  ) => Promise<void>;
  onDeleteChore?: (choreId: string) => Promise<void>;
  chore: Chore;
  currentUserId: string;
  householdMembers?: Profile[];
  className?: string;
  children?: React.ReactNode;
}

const EditChoreButton: React.FC<EditChoreButtonProps> = ({
  onChoreUpdated,
  onChoreDeleted,
  onUpdateChore,
  onDeleteChore,
  chore,
  currentUserId,
  householdMembers = [],
  className = '',
  children,
  ...props
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <motion.div whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          className={`w-full justify-center gap-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 ${className}`}
          {...props}
        >
          {children || (
            <>
              <Edit className="h-4 w-4" />
              <span className="sm:inline">Edit</span>
            </>
          )}
        </Button>
      </motion.div>

      <EditChoreDialog
        chore={chore}
        currentUserId={currentUserId}
        householdMembers={householdMembers}
        onChoreUpdated={onChoreUpdated}
        onChoreDeleted={onChoreDeleted}
        onUpdateChore={onUpdateChore}
        onDeleteChore={onDeleteChore}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
};

export default EditChoreButton;
