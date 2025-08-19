import AddExpenseButton from '@/components/expense/add-expense-button';
import { ExpenseFormData } from '@/components/expense/add-expense-dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Profile } from '@/lib/supabase/schema.alias';
import { ExpenseWithDetails } from '@/lib/supabase/types';
import { Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import ExpenseCard from './card';

interface ExpenseListProps {
  expenses?: ExpenseWithDetails[];
  currentUser: Profile;
  onAddExpense: (data: ExpenseFormData) => Promise<void>;
  onEditExpense?: (expenseId: string, data: ExpenseFormData) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
  onViewDetails: (expense: ExpenseWithDetails) => void;
  onSettle: (expense: ExpenseWithDetails) => void;
  onExpenseUpdated?: () => void;
  householdMembers: Profile[];
  itemsPerPage?: number; // New optional prop to customize items per page
}

export default function ExpenseList({
  expenses,
  currentUser,
  householdMembers,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onViewDetails,
  onSettle,
  onExpenseUpdated,
  itemsPerPage = 10,
}: ExpenseListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination values
  const { paginatedExpenses, totalPages, startIndex, endIndex, totalExpenses } =
    useMemo(() => {
      if (!expenses) {
        return {
          paginatedExpenses: [],
          totalPages: 0,
          startIndex: 0,
          endIndex: 0,
          totalExpenses: 0,
        };
      }

      const total = expenses.length;
      const pages = Math.ceil(total / itemsPerPage);
      const start = (currentPage - 1) * itemsPerPage;
      const end = Math.min(start + itemsPerPage, total);
      const paginated = expenses.slice(start, end);

      return {
        paginatedExpenses: paginated,
        totalPages: pages,
        startIndex: start + 1,
        endIndex: end,
        totalExpenses: total,
      };
    }, [expenses, currentPage, itemsPerPage]);

  // Reset to first page when expenses change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [expenses?.length]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Generate page numbers to show for shadcn pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 10;

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

  console.log(expenses);

  if (expenses?.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center sm:p-12">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground mb-4 px-4 sm:px-0 max-w-xs mx-auto">
            Start by adding your first shared expense
          </p>
          {currentUser.household_id && (
            <div className="flex justify-center">
              <AddExpenseButton
                onAddExpense={onAddExpense}
                householdMembers={householdMembers}
                currentUser={currentUser}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Expense Cards */}
      <div className="space-y-4 sm:px-0">
        {paginatedExpenses.map((expense) => (
          <ExpenseCard
            currentUser={currentUser}
            householdMembers={householdMembers}
            key={expense.id}
            expense={expense}
            onViewDetails={onViewDetails}
            onSettle={onSettle}
            onEditExpense={onEditExpense}
            onDeleteExpense={onDeleteExpense}
            onExpenseUpdated={onExpenseUpdated}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-4">
          {/* Results info */}
          <div className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {totalExpenses} expenses
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
      )}
    </div>
  );
}
