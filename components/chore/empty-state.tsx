import AddChoreButton from '@/components/chore/add-chore-button';
import { Card } from '@/components/ui/card';
import { Chore, Profile } from '@/lib/supabase/types';
import { Calendar, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyChoresStateProps {
  household: { id: string; name: string };
  currentUser: Profile;
  householdMembers: Profile[];
  onChoreAdded: (newChore: Chore) => void;
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
};

export default function EmptyChoresState({
  household,
  currentUser,
  householdMembers,
  onChoreAdded,
}: EmptyChoresStateProps) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Card className="p-6 sm:p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold">
              No chores yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Get started by adding your first chore!
            </p>
          </div>
          <AddChoreButton
            onChoreAdded={onChoreAdded}
            householdId={household.id}
            currentUserId={currentUser.id}
            householdMembers={householdMembers}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Chore
          </AddChoreButton>
        </div>
      </Card>
    </motion.div>
  );
}
