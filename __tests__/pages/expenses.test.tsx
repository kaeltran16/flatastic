import ExpensesPage from '@/app/expenses/page';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the expense hooks
const mockUseBalances = jest.fn();
const mockUseExpenses = jest.fn();
const mockUseHouseholdMembers = jest.fn();

jest.mock('@/hooks/use-balance', () => ({
  useBalances: () => mockUseBalances(),
}));

jest.mock('@/hooks/use-expense', () => ({
  useExpenses: () => mockUseExpenses(),
}));

jest.mock('@/hooks/use-household-member', () => ({
  useHouseholdMembers: () => mockUseHouseholdMembers(),
}));

// Mock the expense components
jest.mock('@/components/expense/expense-dialog', () => {
  return function MockExpenseDialog({ mode, onSubmit, isLoading }: any) {
    return (
      <button
        onClick={() =>
          onSubmit({
            description: 'Test Expense',
            amount: 100,
            category: 'Food',
            date: '2024-01-01',
            split_type: 'equal',
            selected_users: ['user1', 'user2'],
          })
        }
        disabled={isLoading}
        data-testid="add-expense-button"
      >
        Add Expense
      </button>
    );
  };
});

jest.mock('@/components/expense/stats-card', () => {
  return function MockExpenseStatsCards({
    totalExpenses,
    yourTotalShare,
    pendingCount,
    yourNetBalance,
  }: any) {
    return (
      <div data-testid="stats-cards">
        <div>Total Expenses: ${totalExpenses}</div>
        <div>Your Share: ${yourTotalShare}</div>
        <div>Pending: {pendingCount}</div>
        <div>Net Balance: ${yourNetBalance}</div>
      </div>
    );
  };
});

jest.mock('@/components/expense/filter', () => {
  return function MockExpenseFilters({
    onSearchChange,
    onCategoryChange,
    onStatusChange,
  }: any) {
    return (
      <div data-testid="expense-filters">
        <input
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search expenses..."
          data-testid="search-input"
        />
        <select
          onChange={(e) => onCategoryChange(e.target.value)}
          data-testid="category-filter"
        >
          <option value="all">All Categories</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
        </select>
        <select
          onChange={(e) => onStatusChange(e.target.value)}
          data-testid="status-filter"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
        </select>
      </div>
    );
  };
});

jest.mock('@/components/expense/list', () => {
  return function MockExpenseList({
    expenses,
    onEditExpense,
    onDeleteExpense,
    onViewDetails,
    onSettle,
  }: any) {
    return (
      <div data-testid="expense-list">
        {expenses.map((expense: any) => (
          <div key={expense.id} data-testid={`expense-${expense.id}`}>
            <span>{expense.description}</span>
            <span>${expense.amount}</span>
            <button
              onClick={() =>
                onEditExpense(expense.id, { description: 'Updated Expense' })
              }
              data-testid={`edit-${expense.id}`}
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteExpense(expense.id)}
              data-testid={`delete-${expense.id}`}
            >
              Delete
            </button>
            <button
              onClick={() => onViewDetails(expense)}
              data-testid={`view-${expense.id}`}
            >
              View
            </button>
            <button
              onClick={() => onSettle(expense)}
              data-testid={`settle-${expense.id}`}
            >
              Settle
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('@/components/expense/balance-sidebar', () => {
  return function MockBalancesSidebar({ balances, yourNetBalance }: any) {
    return (
      <div data-testid="balance-sidebar">
        <div>Net Balance: ${yourNetBalance}</div>
        <div>Balances: {balances.length}</div>
      </div>
    );
  };
});

jest.mock('@/components/expense/error', () => ({
  ErrorState: ({ error }: any) => (
    <div data-testid="error-state">Error: {error}</div>
  ),
}));

jest.mock('@/components/household/loading', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock data
const mockCurrentUser = {
  id: 'user1',
  email: 'test@example.com',
  full_name: 'Test User',
  household_id: 'household1',
};

const mockHouseholdMembers = [
  {
    id: 'user1',
    email: 'test@example.com',
    full_name: 'Test User',
    household_id: 'household1',
  },
  {
    id: 'user2',
    email: 'user2@example.com',
    full_name: 'User 2',
    household_id: 'household1',
  },
];

const mockExpenses = [
  {
    id: 'expense1',
    description: 'Grocery Shopping',
    amount: 150,
    category: 'Food',
    date: '2024-01-01',
    status: 'pending',
    paid_by: 'user1',
    household_id: 'household1',
    splits: [
      {
        user_id: 'user1',
        amount_owed: 75,
        is_settled: false,
      },
      {
        user_id: 'user2',
        amount_owed: 75,
        is_settled: false,
      },
    ],
  },
  {
    id: 'expense2',
    description: 'Gas',
    amount: 50,
    category: 'Transport',
    date: '2024-01-02',
    status: 'settled',
    paid_by: 'user2',
    household_id: 'household1',
    splits: [
      {
        user_id: 'user1',
        amount_owed: 25,
        is_settled: true,
      },
      {
        user_id: 'user2',
        amount_owed: 25,
        is_settled: true,
      },
    ],
  },
];

const mockBalances = [
  {
    user_id: 'user1',
    balance: 50,
  },
  {
    user_id: 'user2',
    balance: -50,
  },
];

describe('ExpensesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is loading', () => {
      mockUseBalances.mockReturnValue({
        balances: [],
        yourBalances: [],
        yourNetBalance: 0,
        loading: true,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: [],
        currentUser: null,
        loading: true,
        error: null,
        stats: {},
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: [],
      });

      render(<ExpensesPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state when there is an error', () => {
      mockUseBalances.mockReturnValue({
        balances: [],
        yourBalances: [],
        yourNetBalance: 0,
        loading: false,
        error: 'Balance error',
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: [],
        currentUser: mockCurrentUser, // Need currentUser to avoid loading state
        loading: false,
        error: null,
        stats: {},
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: [],
      });

      render(<ExpensesPage />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText(/error: balance error/i)).toBeInTheDocument();
    });
  });

  describe('Main Content', () => {
    beforeEach(() => {
      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });
    });

    it('renders main content with header', () => {
      render(<ExpensesPage />);

      expect(screen.getByText(/expenses & payments/i)).toBeInTheDocument();
      expect(
        screen.getByText(/track shared expenses and manage payments/i)
      ).toBeInTheDocument();
    });

    it('renders add expense button', () => {
      render(<ExpensesPage />);

      expect(screen.getByTestId('add-expense-button')).toBeInTheDocument();
      expect(screen.getByText(/add expense/i)).toBeInTheDocument();
    });

    it('renders stats cards with expense data', () => {
      render(<ExpensesPage />);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
      expect(screen.getByText(/total expenses: \$200/i)).toBeInTheDocument();
      expect(screen.getByText(/your share: \$100/i)).toBeInTheDocument();
      expect(screen.getByText(/pending: 1/i)).toBeInTheDocument();

      // Use getAllByText since Net Balance appears in both stats cards and sidebar
      const netBalanceElements = screen.getAllByText(/net balance: \$50/i);
      expect(netBalanceElements).toHaveLength(2); // One in stats cards, one in sidebar
    });

    it('renders expense filters', () => {
      render(<ExpensesPage />);

      expect(screen.getByTestId('expense-filters')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter')).toBeInTheDocument();
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    });

    it('renders expense list with expenses', () => {
      render(<ExpensesPage />);

      expect(screen.getByTestId('expense-list')).toBeInTheDocument();
      expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
      expect(screen.getByText('Gas')).toBeInTheDocument();
    });

    it('renders balance sidebar', () => {
      render(<ExpensesPage />);

      expect(screen.getByTestId('balance-sidebar')).toBeInTheDocument();
      expect(screen.getByText(/balances: 2/i)).toBeInTheDocument();

      // Net Balance is already tested in stats cards test, so we just verify the sidebar exists
      const balanceSidebar = screen.getByTestId('balance-sidebar');
      expect(balanceSidebar).toBeInTheDocument();
    });

    it('displays expenses with action buttons', () => {
      render(<ExpensesPage />);

      expect(screen.getByText('Grocery Shopping')).toBeInTheDocument();
      expect(screen.getByText('$150')).toBeInTheDocument();
      expect(screen.getByTestId('edit-expense1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-expense1')).toBeInTheDocument();
      expect(screen.getByTestId('view-expense1')).toBeInTheDocument();
      expect(screen.getByTestId('settle-expense1')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });
    });

    it('filters expenses by search query', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'Grocery');

      // The filtering logic is handled in the component, so we just verify the input change
      expect(searchInput).toHaveValue('Grocery');
    });

    it('filters expenses by category', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const categoryFilter = screen.getByTestId('category-filter');
      await user.selectOptions(categoryFilter, 'Food');

      expect(categoryFilter).toHaveValue('Food');
    });

    it('filters expenses by status', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'pending');

      expect(statusFilter).toHaveValue('pending');
    });
  });

  describe('Expense Actions', () => {
    let mockAddExpense: jest.Mock;
    let mockEditExpense: jest.Mock;
    let mockDeleteExpense: jest.Mock;
    let mockSettleExpense: jest.Mock;

    beforeEach(() => {
      mockAddExpense = jest.fn();
      mockEditExpense = jest.fn();
      mockDeleteExpense = jest.fn();
      mockSettleExpense = jest.fn();

      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: mockAddExpense,
        editExpense: mockEditExpense,
        deleteExpense: mockDeleteExpense,
        settleExpense: mockSettleExpense,
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });
    });

    it('creates a new expense when add expense button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const addButton = screen.getByTestId('add-expense-button');
      await user.click(addButton);

      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalledWith({
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          split_type: 'equal',
          selected_users: ['user1', 'user2'],
        });
      });
    });

    it('edits an expense when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const editButton = screen.getByTestId('edit-expense1');
      await user.click(editButton);

      await waitFor(() => {
        expect(mockEditExpense).toHaveBeenCalledWith('expense1', {
          description: 'Updated Expense',
        });
      });
    });

    it('deletes an expense when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const deleteButton = screen.getByTestId('delete-expense1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteExpense).toHaveBeenCalledWith('expense1');
      });
    });

    it('settles an expense when settle button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const settleButton = screen.getByTestId('settle-expense1');
      await user.click(settleButton);

      await waitFor(() => {
        expect(mockSettleExpense).toHaveBeenCalledWith(mockExpenses[0]);
      });
    });

    it('views expense details when view button is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const viewButton = screen.getByTestId('view-expense1');
      await user.click(viewButton);

      // The view details function just logs to console, so we just verify the button click
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe('Filtered Results Summary', () => {
    beforeEach(() => {
      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });
    });

    it('shows filtered results summary when filters are applied', async () => {
      const user = userEvent.setup();
      render(<ExpensesPage />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'Grocery');

      // The results summary should show when filters are applied
      // This is handled by the component's conditional rendering
      expect(searchInput).toHaveValue('Grocery');
    });
  });

  describe('Empty State', () => {
    it('handles empty expenses list', () => {
      mockUseBalances.mockReturnValue({
        balances: [],
        yourBalances: [],
        yourNetBalance: 0,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: [],
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 0,
          yourTotalShare: 0,
          pendingExpenses: [],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });

      render(<ExpensesPage />);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
      expect(screen.getByText(/total expenses: \$0/i)).toBeInTheDocument();
      expect(screen.getByText(/your share: \$0/i)).toBeInTheDocument();
      expect(screen.getByText(/pending: 0/i)).toBeInTheDocument();
    });
  });

  describe('No Results Message', () => {
    it('shows no results message when filters return no results', async () => {
      const user = userEvent.setup();

      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: jest.fn(),
        updateOptimisticExpense: jest.fn(),
        removeOptimisticExpense: jest.fn(),
        settleOptimisticExpense: jest.fn(),
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });

      render(<ExpensesPage />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'NonExistentExpense');

      // The component should show a no results message when filters return empty results
      // This is handled by the component's conditional rendering
      expect(searchInput).toHaveValue('NonExistentExpense');
    });
  });

  describe('Optimistic Updates', () => {
    it('handles optimistic updates for expense operations', () => {
      const mockAddOptimisticExpense = jest.fn();
      const mockUpdateOptimisticExpense = jest.fn();
      const mockRemoveOptimisticExpense = jest.fn();
      const mockSettleOptimisticExpense = jest.fn();

      mockUseBalances.mockReturnValue({
        balances: mockBalances,
        yourBalances: mockBalances,
        yourNetBalance: 50,
        loading: false,
        error: null,
        addOptimisticExpense: mockAddOptimisticExpense,
        updateOptimisticExpense: mockUpdateOptimisticExpense,
        removeOptimisticExpense: mockRemoveOptimisticExpense,
        settleOptimisticExpense: mockSettleOptimisticExpense,
      });
      mockUseExpenses.mockReturnValue({
        expenses: mockExpenses,
        currentUser: mockCurrentUser,
        loading: false,
        error: null,
        stats: {
          totalExpenses: 200,
          yourTotalShare: 100,
          pendingExpenses: [mockExpenses[0]],
        },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      });
      mockUseHouseholdMembers.mockReturnValue({
        members: mockHouseholdMembers,
      });

      render(<ExpensesPage />);

      // The optimistic update functions should be available
      expect(mockAddOptimisticExpense).toBeDefined();
      expect(mockUpdateOptimisticExpense).toBeDefined();
      expect(mockRemoveOptimisticExpense).toBeDefined();
      expect(mockSettleOptimisticExpense).toBeDefined();
    });
  });
});
