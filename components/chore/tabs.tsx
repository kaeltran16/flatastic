import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChoreFormData } from '@/hooks/use-chore';
import { Chore, Household, Profile } from '@/lib/supabase/schema.alias';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
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
  onUpdateChore: (choreId: string, updateData: ChoreFormData) => Promise<void>;
  onDeleteChore: (choreId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  isMarkingComplete: boolean;
  itemsPerPage?: number; // New optional prop to customize items per page
}

// Custom hook for pagination logic
function usePagination(items: Chore[], itemsPerPage: number) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginationData = useMemo(() => {
    if (!items) {
      return {
        paginatedItems: [],
        totalPages: 0,
        startIndex: 0,
        endIndex: 0,
        totalItems: 0,
      };
    }

    const total = items.length;
    const pages = Math.ceil(total / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, total);
    const paginated = items.slice(start, end);

    return {
      paginatedItems: paginated,
      totalPages: pages,
      startIndex: start + 1,
      endIndex: end,
      totalItems: total,
    };
  }, [items, currentPage, itemsPerPage]);

  // Reset to first page when items change
  useEffect(() => {
    if (
      currentPage > paginationData.totalPages &&
      paginationData.totalPages > 0
    ) {
      setCurrentPage(1);
    }
  }, [items?.length, currentPage, paginationData.totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationData.totalPages)));
  };

  // Generate page numbers to show for shadcn pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 10;
    const { totalPages } = paginationData;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page area, and last page with ellipsis
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        if (totalPages > 4) pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        if (totalPages > 4) pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return {
    ...paginationData,
    currentPage,
    goToPage,
    getPageNumbers,
  };
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
  isUpdating,
  isDeleting,
  isMarkingComplete,
  itemsPerPage = 10,
}: ChoreTabsProps) {
  const [activeTab, setActiveTab] = useState('all');

  // Pagination hooks for each tab
  const allChoresPagination = usePagination(filteredChores, itemsPerPage);
  const pendingChoresPagination = usePagination(pendingChores, itemsPerPage);
  const overdueChoresPagination = usePagination(overdueChores, itemsPerPage);
  const completedChoresPagination = usePagination(
    completedChores,
    itemsPerPage
  );

  const getCurrentPagination = () => {
    switch (activeTab) {
      case 'pending':
        return pendingChoresPagination;
      case 'overdue':
        return overdueChoresPagination;
      case 'completed':
        return completedChoresPagination;
      case 'all':
      default:
        return allChoresPagination;
    }
  };

  const renderPagination = () => {
    const pagination = getCurrentPagination();
    const {
      totalPages,
      startIndex,
      endIndex,
      totalItems,
      currentPage,
      goToPage,
      getPageNumbers,
    } = pagination;

    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col items-center gap-4 mt-6">
        {/* Results info */}
        <div className="text-sm text-muted-foreground">
          Showing {startIndex}-{endIndex} of {totalItems} chores
        </div>

        {/* shadcn Pagination */}
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                className={
                  currentPage === 1
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>

            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => goToPage(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  currentPage < totalPages && goToPage(currentPage + 1)
                }
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  const renderChoresList = (chores: Chore[], showActions = true) => {
    if (chores.length === 0 && chores === filteredChores) {
      return (
        <EmptyChoresState
          household={household}
          currentUser={currentUser}
          householdMembers={householdMembers}
          onChoreAdded={onChoreAdded}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <AnimatePresence>
            {chores.map((chore, index) => (
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
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                isMarkingComplete={isMarkingComplete}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <Tabs
        defaultValue="all"
        className="space-y-6"
        onValueChange={setActiveTab}
      >
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
          {renderChoresList(allChoresPagination.paginatedItems)}
        </TabsContent>

        <TabsContent value="pending">
          {renderChoresList(pendingChoresPagination.paginatedItems)}
        </TabsContent>

        <TabsContent value="overdue">
          {renderChoresList(overdueChoresPagination.paginatedItems)}
        </TabsContent>

        <TabsContent value="completed">
          {renderChoresList(completedChoresPagination.paginatedItems, false)}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
