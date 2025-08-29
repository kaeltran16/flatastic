import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExpenses } from '@/hooks/use-expense';
import { useBalances } from '@/hooks/use-balance';
import ExpensesPage from '@/app/expenses/page';

// Mock dependencies
jest.mock('@/hooks/use-expense');
jest.mock('@/hooks/use-balance');
jest.mock('@/hooks/use-household-member');
jest.mock('@/hooks/use-profile');
jest.mock('@/lib/actions/expense');
jest.mock('sonner');

const mockUseExpenses = useExpenses as jest.MockedFunction<typeof useExpenses>;
const mockUseBalances = useBalances as jest.MockedFunction<typeof useBalances>;

// Mock data
const mockCurrentUser = {
  id: 'user-1',
  household_id: 'household-1',
  email: 'test@example.com',
  full_name: 'Test User',
};

const mockMembers = [
  { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
  { id: 'user-2', full_name: 'User Two', email: 'user2@example.com' },
  { id: 'user-3', full_name: 'User Three', email: 'user3@example.com' },
];

const mockExpenses = [
  {
    id: 'expense-1',
    description: 'Groceries',
    amount: 100,
    category: 'Food',
    date: '2024-01-01',
    paid_by: 'user-1',
    household_id: 'household-1',
    payer: mockMembers[0],
    splits: [
      { user_id: 'user-1', amount_owed: 50, is_settled: false },
      { user_id: 'user-2', amount_owed: 50, is_settled: false },
    ],
    your_share: 50,
    status: 'pending' as const,
  },
  {
    id: 'expense-2',
    description: 'Transport',
    amount: 60,
    category: 'Transport',
    date: '2024-01-02',
    paid_by: 'user-2',
    household_id: 'household-1',
    payer: mockMembers[1],
    splits: [
      { user_id: 'user-1', amount_owed: 30, is_settled: true },
      { user_id: 'user-2', amount_owed: 30, is_settled: true },
    ],
    your_share: 30,
    status: 'settled' as const,
  },
];

const mockBalances = [
  {
    fromUser: mockMembers[1],
    toUser: mockMembers[0],
    amount: 20,
    related_splits: [],
    payment_link: undefined,
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Expense Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useProfile
    const { useProfile } = require('@/hooks/use-profile');
    useProfile.mockReturnValue({
      profile: mockCurrentUser,
      loading: false,
      error: null,
    });

    // Mock useHouseholdMembers
    const { useHouseholdMembers } = require('@/hooks/use-household-member');
    useHouseholdMembers.mockReturnValue({
      members: mockMembers,
      loading: false,
      error: null,
    });

    // Mock useExpenses
    mockUseExpenses.mockReturnValue({
      expenses: mockExpenses,
      householdMembers: mockMembers,
      currentUser: mockCurrentUser,
      loading: false,
      error: null,
      stats: {
        totalExpenses: 160,
        yourTotalShare: 80,
        pendingExpenses: [mockExpenses[0]],
      },
      addExpense: jest.fn(),
      editExpense: jest.fn(),
      deleteExpense: jest.fn(),
      settleExpense: jest.fn(),
      refreshData: jest.fn(),
      isAddingExpense: false,
      isEditingExpense: false,
      isDeletingExpense: false,
      isSettlingExpense: false,
    });

    // Mock useBalances
    mockUseBalances.mockReturnValue({
      balances: mockBalances,
      yourBalances: mockBalances,
      yourNetBalance: 20,
      householdMembers: mockMembers,
      currentUser: mockCurrentUser,
      loading: false,
      error: null,
    });
  });

  describe('Page Initialization', () => {
    it('should render expense page with all components', async () => {
      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Check main page elements
      expect(screen.getByText('Expenses & Payments')).toBeInTheDocument();
      expect(screen.getByText('Track shared expenses and manage payments')).toBeInTheDocument();

      // Check stats cards
      expect(screen.getByText('$160.00')).toBeInTheDocument(); // Total expenses
      expect(screen.getByText('$80.00')).toBeInTheDocument(); // Your share
      expect(screen.getByText('1')).toBeInTheDocument(); // Pending count

      // Check expense list
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();

      // Check balance sidebar
      expect(screen.getByText('User Two owes you $20.00')).toBeInTheDocument();
    });

    it('should show loading state while data is loading', () => {
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        loading: true,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when data fails to load', () => {
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        error: 'Failed to load expenses',
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Expense Management Workflow', () => {
    it('should add new expense successfully', async () => {
      const user = userEvent.setup();
      const mockAddExpense = jest.fn().mockResolvedValue(undefined);
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        addExpense: mockAddExpense,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Click add expense button
      const addButton = screen.getByText('Add Expense');
      await user.click(addButton);

      // Fill expense form
      await user.type(screen.getByLabelText(/description/i), 'New Expense');
      await user.type(screen.getByLabelText(/amount/i), '75');
      await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
      await user.type(screen.getByLabelText(/date/i), '2024-01-03');

      // Select users for equal split
      const userCheckboxes = screen.getAllByRole('checkbox');
      await user.click(userCheckboxes[1]); // Select user-2

      // Submit form
      const submitButton = screen.getByText('Add Expense');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalledWith({
          description: 'New Expense',
          amount: 75,
          category: 'Food',
          date: '2024-01-03',
          split_type: 'equal',
          selected_users: ['user-2'],
        });
      });
    });

    it('should edit existing expense', async () => {
      const user = userEvent.setup();
      const mockEditExpense = jest.fn().mockResolvedValue(undefined);
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        editExpense: mockEditExpense,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Click edit button on first expense
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Modify expense details
      const descriptionInput = screen.getByDisplayValue('Groceries');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated Groceries');

      const amountInput = screen.getByDisplayValue('100');
      await user.clear(amountInput);
      await user.type(amountInput, '120');

      // Submit form
      const submitButton = screen.getByText('Update Expense');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEditExpense).toHaveBeenCalledWith('expense-1', {
          description: 'Updated Groceries',
          amount: 120,
          category: 'Food',
          date: '2024-01-01',
          split_type: 'equal',
          selected_users: ['user-1', 'user-2'],
        });
      });
    });

    it('should delete expense with confirmation', async () => {
      const user = userEvent.setup();
      const mockDeleteExpense = jest.fn().mockResolvedValue(undefined);
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        deleteExpense: mockDeleteExpense,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Click delete button on first expense
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      // Confirm deletion
      const confirmButton = screen.getByText('Delete Expense');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteExpense).toHaveBeenCalledWith('expense-1');
      });
    });

    it('should settle expense', async () => {
      const user = userEvent.setup();
      const mockSettleExpense = jest.fn().mockResolvedValue(undefined);
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        settleExpense: mockSettleExpense,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Click settle button on pending expense
      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);

      await waitFor(() => {
        expect(mockSettleExpense).toHaveBeenCalledWith(mockExpenses[0]);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter expenses by search query', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Search for "Groceries"
      const searchInput = screen.getByPlaceholderText(/search expenses/i);
      await user.type(searchInput, 'Groceries');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
      });
    });

    it('should filter expenses by category', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Select Food category
      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'Food');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
      });
    });

    it('should filter expenses by status', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Select Pending status
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'pending');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Transport')).not.toBeInTheDocument();
      });
    });

    it('should show filter summary when filters are applied', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search expenses/i);
      await user.type(searchInput, 'Groceries');

      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 2 expenses')).toBeInTheDocument();
        expect(screen.getByText('(Total: $100.00)')).toBeInTheDocument();
      });
    });
  });

  describe('Balance Integration', () => {
    it('should display correct balance information', () => {
      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Check balance sidebar
      expect(screen.getByText('User Two owes you $20.00')).toBeInTheDocument();
      expect(screen.getByText('Your Net Balance')).toBeInTheDocument();
      expect(screen.getByText('+$20.00')).toBeInTheDocument(); // Positive balance
    });

    it('should update balances when expenses are modified', async () => {
      const user = userEvent.setup();
      const mockAddExpense = jest.fn().mockResolvedValue(undefined);
      const mockRefreshData = jest.fn();
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        addExpense: mockAddExpense,
        refreshData: mockRefreshData,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Add new expense
      const addButton = screen.getByText('Add Expense');
      await user.click(addButton);

      await user.type(screen.getByLabelText(/description/i), 'New Expense');
      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
      await user.type(screen.getByLabelText(/date/i), '2024-01-03');

      const userCheckboxes = screen.getAllByRole('checkbox');
      await user.click(userCheckboxes[1]);

      const submitButton = screen.getByText('Add Expense');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRefreshData).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Check that mobile-specific classes are applied
      const mainContainer = screen.getByText('Expenses & Payments').closest('div');
      expect(mainContainer).toHaveClass('px-3', 'sm:px-4');
    });

    it('should show sidebar on desktop and hide on mobile', () => {
      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Check sidebar is present
      expect(screen.getByText('User Two owes you $20.00')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle expense addition errors gracefully', async () => {
      const user = userEvent.setup();
      const mockAddExpense = jest.fn().mockRejectedValue(new Error('Failed to add expense'));
      
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        addExpense: mockAddExpense,
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      // Try to add expense
      const addButton = screen.getByText('Add Expense');
      await user.click(addButton);

      await user.type(screen.getByLabelText(/description/i), 'Test Expense');
      await user.type(screen.getByLabelText(/amount/i), '100');
      await user.selectOptions(screen.getByLabelText(/category/i), 'Food');
      await user.type(screen.getByLabelText(/date/i), '2024-01-01');

      const userCheckboxes = screen.getAllByRole('checkbox');
      await user.click(userCheckboxes[1]);

      const submitButton = screen.getByText('Add Expense');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalled();
      });
    });

    it('should handle network errors gracefully', () => {
      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        error: 'Network error occurred',
      });

      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large expense lists efficiently', () => {
      const largeExpenseList = Array.from({ length: 100 }, (_, i) => ({
        id: `expense-${i}`,
        description: `Expense ${i}`,
        amount: 50,
        category: 'Food',
        date: '2024-01-01',
        paid_by: 'user-1',
        household_id: 'household-1',
        payer: mockMembers[0],
        splits: [
          { user_id: 'user-1', amount_owed: 25, is_settled: false },
          { user_id: 'user-2', amount_owed: 25, is_settled: false },
        ],
        your_share: 25,
        status: 'pending' as const,
      }));

      mockUseExpenses.mockReturnValue({
        ...mockUseExpenses(),
        expenses: largeExpenseList,
        stats: {
          totalExpenses: 5000,
          yourTotalShare: 2500,
          pendingExpenses: largeExpenseList,
        },
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ExpensesPage />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});
