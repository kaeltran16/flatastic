import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chore, Household, Profile } from '@/lib/supabase/schema.alias';
import { AnimatePresence, motion } from 'motion/react';
import { ChoreUpdateData } from '../../app/chores/page';
import ChoreCard from './card';
import EmptyChoresState from './empty-state';

interface ChoreTabsProps {
  filteredChores: Chore[];
  pendingChores: Chore[];
  overdueChores: Chore[];
  completedChores: Chore[];
  household: Household;
  currentUser: Profile;
  householdMembers: Profile[];
  onChoreAdded: (newChore: Chore) => void;
  onMarkComplete: (choreId: string) => void;
  onChoreUpdated: (updatedChore: Chore) => void;
  onChoreDeleted: (choreId: string) => void;
  onUpdateChore: (
    choreId: string,
    updateData: ChoreUpdateData
  ) => Promise<void>;
  onDeleteChore: (choreId: string) => Promise<void>;
}

export default function ChoreTabs({
  filteredChores,
  pendingChores,
  overdueChores,
  completedChores,
  household,
  currentUser,
  householdMembers,
  onChoreAdded,
  onMarkComplete,
  onChoreUpdated,
  onChoreDeleted,
  onUpdateChore,
  onDeleteChore,
}: ChoreTabsProps) {
  const renderChoresList = (chores: Chore[], showActions = true) => (
    <div className="space-y-4">
      <AnimatePresence>
        {chores.length === 0 && chores === filteredChores ? (
          <EmptyChoresState
            household={household}
            currentUser={currentUser}
            householdMembers={householdMembers}
            onChoreAdded={onChoreAdded}
          />
        ) : (
          chores.map((chore, index) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              householdMembers={householdMembers}
              currentUser={currentUser}
              index={index}
              showActions={showActions}
              onMarkComplete={showActions ? onMarkComplete : undefined}
              onChoreUpdated={onChoreUpdated}
              onChoreDeleted={onChoreDeleted}
              onUpdateChore={onUpdateChore}
              onDeleteChore={onDeleteChore}
            />
          ))
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({filteredChores.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending ({pendingChores.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs sm:text-sm">
            Overdue ({overdueChores.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            Done ({completedChores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderChoresList(filteredChores)}
        </TabsContent>

        <TabsContent value="pending">
          {renderChoresList(pendingChores)}
        </TabsContent>

        <TabsContent value="overdue">
          {renderChoresList(overdueChores)}
        </TabsContent>

        <TabsContent value="completed">
          {renderChoresList(completedChores, false)}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
