import AddChoreButton from '@/components/chore/add-chore-button';
import { Chore, Household, Profile } from '@/lib/supabase/schema.alias';
import { motion } from 'motion/react';
import Link from 'next/link';

interface NavigationBarProps {
  household: Household;
  currentUser: Profile;
  householdMembers: Profile[];
  onChoreAdded: (newChore: Chore) => void;
}

export default function NavigationBar({
  household,
  currentUser,
  householdMembers,
  onChoreAdded,
}: NavigationBarProps) {
  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b bg-card"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0">
            <Link href="/" className="flex items-center">
              <span className="text-lg sm:text-xl font-bold truncate">
                Flatastic
              </span>
            </Link>
            <span className="ml-2 sm:ml-4 text-muted-foreground">/</span>
            <span className="ml-2 sm:ml-4 font-medium truncate">Chores</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <AddChoreButton
              onChoreAdded={onChoreAdded}
              householdId={household.id}
              currentUserId={currentUser.id}
              householdMembers={householdMembers}
              className="text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
