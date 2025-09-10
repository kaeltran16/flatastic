import ChoreDialog from '@/components/chore/chore-dialog';
import { Card } from '@/components/ui/card';
import { Chore, Profile } from '@/lib/supabase/schema.alias';
import { Calendar } from 'lucide-react';
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
          <ChoreDialog
            mode="create"
            householdId={household.id}
            currentUser={currentUser}
            householdMembers={householdMembers}
            onSubmit={async (formData) => {
              await onChoreAdded(formData as unknown as Chore);
            }}
            isLoading={false}
          />
        </div>
      </Card>
    </motion.div>
  );
}
