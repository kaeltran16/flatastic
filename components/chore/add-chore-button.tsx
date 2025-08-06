'use client';

import { Chore, Profile } from '@/lib/supabase/types';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../ui/button';
import AddChoreDialog from './add-chore-dialog';

interface ChoreUpdateData {
  name: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  recurring_type?: 'daily' | 'weekly' | 'monthly' | 'none';
  recurring_interval?: number;
}

interface AddChoreButtonProps extends React.ComponentProps<typeof Button> {
  onChoreAdded?: (chore: Chore) => void;
  householdId: string;
  currentUserId: string;
  householdMembers?: Profile[];
  className?: string;
  children?: React.ReactNode;
}

const AddChoreButton: React.FC<AddChoreButtonProps> = ({
  onChoreAdded,
  householdId,
  currentUserId,
  householdMembers = [],
  className = '',
  children,
  ...props
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const handleChoreAdded = (chore: Chore): void => {
    console.log('New chore added:', chore);

    if (onChoreAdded) {
      onChoreAdded(chore);
    }
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          className={className}
          onClick={() => setIsDialogOpen(true)}
          {...props}
        >
          {children || (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Chore
            </>
          )}
        </Button>
      </motion.div>

      <AddChoreDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onChoreAdded={handleChoreAdded}
        householdId={householdId}
        currentUserId={currentUserId}
        householdMembers={householdMembers}
      />
    </>
  );
};

export default AddChoreButton;
