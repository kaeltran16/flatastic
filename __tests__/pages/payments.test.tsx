import PaymentsPage from '@/app/payments/page';
import { useSettlements } from '@/hooks/use-settlement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the useSettlements hook
jest.mock('@/hooks/use-settlement');
const mockUseSettlements = useSettlements as jest.MockedFunction<
  typeof useSettlements
>;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the settlement dialog component
jest.mock('@/components/payment/settlement-dialog', () => {
  return function MockSettlementDialog({
    open,
    onOpenChange,
    selectedBalance,
    onSettle,
  }: any) {
    if (!open) return null;

    return (
      <div data-testid="settlement-dialog">
        <h2>Settlement Dialog</h2>
        <p>Balance: ${selectedBalance?.amount}</p>
        <button onClick={() => onSettle(selectedBalance, 50, 'Test payment')}>
          Settle Payment
        </button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    );
  };
});

// Mock the balance card component
jest.mock('@/components/payment/balance-card', () => {
  return function MockBalanceCard({
    balance,
    currentUserId,
    onSettle,
    variant,
  }: any) {
    return (
      <div data-testid={`balance-card-${variant}`}>
        <p>From: {balance.fromUser.full_name}</p>
        <p>To: {balance.toUser.full_name}</p>
        <p>Amount: ${balance.amount}</p>
        <button onClick={() => onSettle(balance)}>Settle</button>
      </div>
    );
  };
});

// Mock the stats cards component
jest.mock('@/components/payment/stats-cards', () => {
  return function MockStatsCards({
    totalOwed,
    totalOwing,
    completedCount,
  }: any) {
    return (
      <div data-testid="stats-cards">
        <p>Total Owed: ${totalOwed}</p>
        <p>Total Owing: ${totalOwing}</p>
        <p>Completed: {completedCount}</p>
      </div>
    );
  };
});

// Mock the payment sidebar component
jest.mock('@/components/payment/payment-sidebar', () => {
  return function MockPaymentSidebar({ userBalances, onRecordPayment }: any) {
    return (
      <div data-testid="payment-sidebar">
        <p>Balances: {userBalances.length}</p>
        <button onClick={onRecordPayment}>Record Payment</button>
      </div>
    );
  };
});

// Mock the settlement card component
jest.mock('@/components/payment/settlement-card', () => {
  return function MockSettlementCard({ settlement, currentUserId }: any) {
    return (
      <div data-testid="settlement-card">
        <p>From: {settlement.fromUser.full_name}</p>
        <p>To: {settlement.toUser.full_name}</p>
        <p>Amount: ${settlement.amount}</p>
        <p>Date: {settlement.date}</p>
      </div>
    );
  };
});

// Mock user data
const mockUser = {
  id: 'user-1',
  full_name: 'John Doe',
  email: 'john@example.com',
  household_id: 'household-1',
  payment_link: 'https://pay.example.com/john',
  avatar_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockHouseholdMembers = [
  mockUser,
  {
    id: 'user-2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    household_id: 'household-1',
    payment_link: 'https://pay.example.com/jane',
    avatar_url: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  {
    id: 'user-3',
    full_name: 'Bob Johnson',
    email: 'bob@example.com',
    household_id: 'household-1',
    payment_link: 'https://pay.example.com/bob',
    avatar_url: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

const mockBalances = [
  {
    fromUser: mockUser,
    toUser: mockHouseholdMembers[1],
    amount: 150.0,
    related_splits: [
      {
        id: 'split-1',
        amount_owed: 100.0,
        expense_id: 'expense-1',
        user_id: 'user-1',
        is_settled: false,
        expense: {
          id: 'expense-1',
          description: 'Groceries',
          amount: 200.0,
          date: '2024-01-15',
          category: 'food',
          household_id: 'household-1',
          paid_by: 'user-2',
          split_type: 'equal',
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
        },
      },
      {
        id: 'split-2',
        amount_owed: 50.0,
        expense_id: 'expense-2',
        user_id: 'user-1',
        is_settled: false,
        expense: {
          id: 'expense-2',
          description: 'Utilities',
          amount: 100.0,
          date: '2024-01-10',
          category: 'utilities',
          household_id: 'household-1',
          paid_by: 'user-2',
          split_type: 'equal',
          created_at: '2024-01-10',
          updated_at: '2024-01-10',
        },
      },
    ],
    payment_link: 'https://pay.example.com/john',
  },
  {
    fromUser: mockHouseholdMembers[2],
    toUser: mockUser,
    amount: 75.0,
    related_splits: [
      {
        id: 'split-3',
        amount_owed: 75.0,
        expense_id: 'expense-3',
        user_id: 'user-3',
        is_settled: false,
        expense: {
          id: 'expense-3',
          description: 'Internet',
          amount: 150.0,
          date: '2024-01-12',
          category: 'utilities',
          household_id: 'household-1',
          paid_by: 'user-1',
          split_type: 'equal',
          created_at: '2024-01-12',
          updated_at: '2024-01-12',
        },
      },
    ],
    payment_link: 'https://pay.example.com/bob',
  },
];

const mockCompletedSettlements = [
  {
    id: 'settlement-1',
    fromUser: mockUser,
    toUser: mockHouseholdMembers[1],
    amount: 50.0,
    description: 'Partial payment for groceries',
    status: 'completed' as const,
    date: '2024-01-20',
    note: 'Paid via Venmo',
    settled_at: '2024-01-20',
    created_at: '2024-01-20',
    updated_at: '2024-01-20',
  },
];

const mockSettlePayment = jest.fn();

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
};

describe('PaymentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseSettlements.mockReturnValue({
      balances: mockBalances,
      completedSettlements: mockCompletedSettlements,
      householdMembers: mockHouseholdMembers,
      currentUser: mockUser,
      loading: false,
      error: null,
      settlePayment: mockSettlePayment,
      refreshData: jest.fn(),
    });
  });

  describe('Page Rendering', () => {
    it('renders the payments page with correct title and description', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('Payments & Settlements')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Track and manage payment settlements from shared expenses'
        )
      ).toBeInTheDocument();
    });

    it('displays stats cards with correct information', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
      expect(screen.getByText('Total Owed: $75')).toBeInTheDocument();
      expect(screen.getByText('Total Owing: $150')).toBeInTheDocument();
      expect(screen.getByText('Completed: 1')).toBeInTheDocument();
    });

    it('shows payment sidebar with correct balance count', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getByTestId('payment-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Balances: 2')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all three tabs with correct labels and counts', () => {
      renderWithProviders(<PaymentsPage />);

      expect(
        screen.getByRole('tab', { name: /pending \(2\)/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /completed \(1\)/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /all settlements/i })
      ).toBeInTheDocument();
    });

    it('shows pending balances by default', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getAllByTestId('balance-card-net')).toHaveLength(2);
      expect(screen.getAllByTestId('balance-card-individual')).toHaveLength(2);
    });

    it('switches to completed tab and shows completed settlements', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const completedTab = screen.getByRole('tab', {
        name: /completed \(1\)/i,
      });
      await user.click(completedTab);

      expect(screen.getByTestId('settlement-card')).toBeInTheDocument();
      expect(screen.getByText('From: John Doe')).toBeInTheDocument();
      expect(screen.getByText('To: Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Amount: $50')).toBeInTheDocument();
    });

    it('switches to all settlements tab and shows both pending and completed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const allTab = screen.getByRole('tab', { name: /all settlements/i });
      await user.click(allTab);

      expect(screen.getAllByTestId('balance-card-all')).toHaveLength(2);
      expect(screen.getByTestId('settlement-card')).toBeInTheDocument();
    });
  });

  describe('Balance Cards', () => {
    it('displays balance cards with correct user information', () => {
      renderWithProviders(<PaymentsPage />);

      const balanceCards = screen.getAllByTestId(/balance-card-/);
      expect(balanceCards).toHaveLength(4); // 2 balances × 2 variants (net + individual)

      expect(screen.getAllByText('From: John Doe')).toHaveLength(2);
      expect(screen.getAllByText('To: Jane Smith')).toHaveLength(2);
      expect(screen.getAllByText('Amount: $150')).toHaveLength(2);
    });

    it('shows net balances section with correct count', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('Net Balances')).toBeInTheDocument();
      expect(screen.getByText('2 pending')).toBeInTheDocument();
    });

    it('shows individual expense splits section', () => {
      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('Individual Expense Splits')).toBeInTheDocument();
      expect(screen.getByText('3 splits')).toBeInTheDocument(); // Total splits across all balances
    });
  });

  describe('Settlement Dialog', () => {
    it('opens settlement dialog when settle button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);

      expect(screen.getByTestId('settlement-dialog')).toBeInTheDocument();
      expect(screen.getByText('Balance: $150')).toBeInTheDocument();
    });

    it('closes settlement dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      // Open dialog
      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);
      expect(screen.getByTestId('settlement-dialog')).toBeInTheDocument();

      // Close dialog
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByTestId('settlement-dialog')).not.toBeInTheDocument();
    });

    it('calls settlePayment when settlement is confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      // Open dialog
      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);

      // Confirm settlement
      const settlePaymentButton = screen.getByText('Settle Payment');
      await user.click(settlePaymentButton);

      expect(mockSettlePayment).toHaveBeenCalledWith(
        mockBalances[0],
        50,
        'Test payment'
      );
    });
  });

  describe('Empty States', () => {
    it('shows "all settled up" message when no pending balances', () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: mockCompletedSettlements,
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('All settled up!')).toBeInTheDocument();
      expect(
        screen.getByText('No outstanding balances between household members')
      ).toBeInTheDocument();
      expect(screen.getByText('Back to Expenses')).toBeInTheDocument();
    });

    it('shows "no completed payments" message when no completed settlements', async () => {
      mockUseSettlements.mockReturnValue({
        balances: mockBalances,
        completedSettlements: [],
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const completedTab = screen.getByRole('tab', {
        name: /completed \(0\)/i,
      });
      await user.click(completedTab);

      expect(screen.getByText('No completed payments')).toBeInTheDocument();
      expect(
        screen.getByText('Completed settlements will appear here.')
      ).toBeInTheDocument();
    });

    it('shows "no settlements yet" message when no balances or settlements', async () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: [],
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const allTab = screen.getByRole('tab', { name: /all settlements/i });
      await user.click(allTab);

      expect(screen.getByText('No settlements yet')).toBeInTheDocument();
      expect(
        screen.getByText('Add some expenses to start tracking settlements.')
      ).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading spinner when data is loading', () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: [],
        householdMembers: [],
        currentUser: undefined,
        loading: true,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      // The loading spinner should be rendered by the LoadingSpinner component
      // We can't directly test it since it's mocked, but we can verify the loading state
      expect(
        screen.queryByText('Payments & Settlements')
      ).not.toBeInTheDocument();
    });

    it('shows error message when there is an error', () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: [],
        householdMembers: [],
        currentUser: undefined,
        loading: false,
        error: 'Failed to load settlement data',
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      expect(
        screen.getByText('Failed to load settlement data')
      ).toBeInTheDocument();
    });

    it('shows error when user is not authenticated', () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: [],
        householdMembers: [],
        currentUser: undefined,
        loading: false,
        error: 'Not authenticated',
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    });

    it('shows error when user has no household', () => {
      mockUseSettlements.mockReturnValue({
        balances: [],
        completedSettlements: [],
        householdMembers: [],
        currentUser: undefined,
        loading: false,
        error: 'No household found',
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      expect(screen.getByText('No household found')).toBeInTheDocument();
    });
  });

  describe('Payment Sidebar', () => {
    it('enables record payment button when there are balances', () => {
      renderWithProviders(<PaymentsPage />);

      const recordPaymentButton = screen.getByText('Record Payment');
      expect(recordPaymentButton).toBeInTheDocument();
      expect(recordPaymentButton).not.toBeDisabled();
    });

    it('opens settlement dialog when record payment is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const recordPaymentButton = screen.getByText('Record Payment');
      await user.click(recordPaymentButton);

      expect(screen.getByTestId('settlement-dialog')).toBeInTheDocument();
    });
  });

  describe('Data Filtering', () => {
    it('filters balances to only show those involving current user', () => {
      // Add a balance that doesn't involve the current user
      const otherBalances = [
        {
          fromUser: mockHouseholdMembers[1],
          toUser: mockHouseholdMembers[2],
          amount: 25.0,
          related_splits: [],
          payment_link: '',
        },
      ];

      mockUseSettlements.mockReturnValue({
        balances: [...mockBalances, ...otherBalances],
        completedSettlements: mockCompletedSettlements,
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      // Should only show balances involving the current user (2 balances)
      expect(screen.getAllByTestId(/balance-card-/)).toHaveLength(4); // 2 balances × 2 variants
    });

    it('filters completed settlements to only show those involving current user', async () => {
      // Add a settlement that doesn't involve the current user
      const otherSettlements = [
        {
          id: 'settlement-2',
          fromUser: mockHouseholdMembers[1],
          toUser: mockHouseholdMembers[2],
          amount: 30.0,
          description: 'Other payment',
          status: 'completed' as const,
          date: '2024-01-21',
          note: 'Other note',
          settled_at: '2024-01-21',
          created_at: '2024-01-21',
          updated_at: '2024-01-21',
        },
      ];

      mockUseSettlements.mockReturnValue({
        balances: mockBalances,
        completedSettlements: [
          ...mockCompletedSettlements,
          ...otherSettlements,
        ],
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      const user = userEvent.setup();
      renderWithProviders(<PaymentsPage />);

      const completedTab = screen.getByRole('tab', {
        name: /completed \(1\)/i,
      });
      await user.click(completedTab);

      // Should only show settlements involving the current user (1 settlement)
      expect(screen.getByTestId('settlement-card')).toBeInTheDocument();
      expect(screen.getByText('From: John Doe')).toBeInTheDocument();
    });
  });

  describe('Amount Calculations', () => {
    it('correctly calculates total owed and owing amounts', () => {
      renderWithProviders(<PaymentsPage />);

      // Current user owes $150 to Jane Smith
      // Current user is owed $75 by Bob Johnson
      // Net: Current user owes $75 total
      expect(screen.getByText('Total Owed: $75')).toBeInTheDocument();
      expect(screen.getByText('Total Owing: $150')).toBeInTheDocument();
    });

    it('updates counts when balances change', () => {
      const updatedBalances = [
        {
          fromUser: mockUser,
          toUser: mockHouseholdMembers[1],
          amount: 200.0,
          related_splits: [],
          payment_link: '',
        },
      ];

      mockUseSettlements.mockReturnValue({
        balances: updatedBalances,
        completedSettlements: mockCompletedSettlements,
        householdMembers: mockHouseholdMembers,
        currentUser: mockUser,
        loading: false,
        error: null,
        settlePayment: mockSettlePayment,
        refreshData: jest.fn(),
      });

      renderWithProviders(<PaymentsPage />);

      expect(
        screen.getByRole('tab', { name: /pending \(1\)/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Total Owing: $200')).toBeInTheDocument();
      expect(screen.getByText('Total Owed: $0')).toBeInTheDocument();
    });
  });
});
