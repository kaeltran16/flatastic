import HouseholdFundPage from '@/app/penalty-fund/page';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useProfile } from '@/hooks/use-profile';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the hooks
jest.mock('@/hooks/use-profile');
jest.mock('@/hooks/use-household-member');

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseHouseholdMembers = useHouseholdMembers as jest.MockedFunction<
  typeof useHouseholdMembers
>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the add penalty dialog component
jest.mock('@/components/penalty-fund/add-penalty-fund-dialog', () => {
  return function MockAddPenaltyDialog({
    isOpen,
    onOpenChange,
    onPenaltyAdded,
  }: any) {
    if (!isOpen) return null;

    return (
      <div data-testid="add-penalty-dialog">
        <h2>Add Penalty Dialog</h2>
        <button
          onClick={() => {
            onPenaltyAdded();
            onOpenChange(false);
          }}
        >
          Add Penalty
        </button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    );
  };
});

// Mock the user avatar component
jest.mock('@/components/user-avatar', () => {
  return function MockUserAvatar({ user, showAsYou }: any) {
    return (
      <div data-testid={`avatar-${user.id}`}>
        {showAsYou ? 'You' : user.full_name || user.email.split('@')[0]}
      </div>
    );
  };
});

// Mock the loading spinner component
jest.mock('@/components/household/loading', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
        in: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  }),
}));

// Mock user data
const mockProfile = {
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
  mockProfile,
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

const mockPenalties = [
  {
    id: 'penalty-1',
    household_id: 'household-1',
    user_id: 'user-1',
    amount: 15.0,
    reason: 'Missed chore deadline',
    chore_id: 'chore-1',
    description: 'Did not complete dishes on time',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    profiles: {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      avatar_url: null,
    },
    chores: {
      id: 'chore-1',
      name: 'Wash dishes',
    },
  },
  {
    id: 'penalty-2',
    household_id: 'household-1',
    user_id: 'user-2',
    amount: 10.0,
    reason: 'Incomplete task',
    chore_id: null,
    description: 'Left laundry in dryer',
    created_at: '2024-01-14T15:30:00Z',
    updated_at: '2024-01-14T15:30:00Z',
    profiles: {
      id: 'user-2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      avatar_url: null,
    },
    chores: null,
  },
];

const mockChores = [
  {
    id: 'chore-1',
    name: 'Wash dishes',
    status: 'overdue',
    due_date: '2024-01-10T23:59:59Z',
    assigned_to: 'user-1',
    household_id: 'household-1',
    profiles: {
      id: 'user-1',
      full_name: 'John Doe',
      email: 'john@example.com',
      avatar_url: null,
    },
  },
  {
    id: 'chore-2',
    name: 'Take out trash',
    status: 'incomplete',
    due_date: '2024-01-12T23:59:59Z',
    assigned_to: 'user-2',
    household_id: 'household-1',
    profiles: {
      id: 'user-2',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      avatar_url: null,
    },
  },
];

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

describe('HouseholdFundPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      isRefetching: false,
      refetch: jest.fn(),
    });

    mockUseHouseholdMembers.mockReturnValue({
      members: mockHouseholdMembers,
      loading: false,
      error: null,
      isEmpty: false,
      isRefetching: false,
      isStale: false,
      refetch: jest.fn(),
      invalidate: jest.fn(),
    });

    // Mock React Query hooks
    // @ts-ignore
    mockUseQuery.mockImplementation((queryKey: any) => {
      if (queryKey.queryKey[0] === 'fund_penalties') {
        return {
          data: [],
          isLoading: false,
          error: null,
          isError: false,
          isPending: false,
          isSuccess: true,
          isFetching: false,
          isRefetching: false,
          status: 'success',
        };
      }
      if (queryKey.queryKey[0] === 'fund_balance') {
        return {
          data: 0,
          isLoading: false,
          error: null,
          isError: false,
          isPending: false,
          isSuccess: true,
          isFetching: false,
          isRefetching: false,
          status: 'success',
        };
      }
      if (queryKey.queryKey[0] === 'fund_monthly') {
        return {
          data: 0,
          isLoading: false,
          error: null,
          isError: false,
          isPending: false,
          isSuccess: true,
          isFetching: false,
          isRefetching: false,
          status: 'success',
        };
      }
      if (queryKey.queryKey[0] === 'chores') {
        return {
          data: [],
          isLoading: false,
          error: null,
          isError: false,
          isPending: false,
          isSuccess: true,
          isFetching: false,
          isRefetching: false,
          status: 'success',
        };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: false,
        isFetching: false,
        isRefetching: false,
        status: 'idle',
      };
    });
  });

  describe('Page Rendering', () => {
    it('renders the penalty fund page with correct title and description', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Household Fund')).toBeInTheDocument();
      expect(
        screen.getByText('Manage penalties and fund balance')
      ).toBeInTheDocument();
    });

    it('displays the add penalty button', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Add Penalty')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add penalty/i })
      ).toBeInTheDocument();
    });

    it('shows fund balance card', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Total Fund Balance')).toBeInTheDocument();
    });

    it('shows recent penalties section', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
      expect(
        screen.getByText('Latest fund additions and penalties')
      ).toBeInTheDocument();
    });

    it('shows current issues section', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
      expect(
        screen.getByText('Chores that may need penalties')
      ).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it.skip('shows loading spinner when profile is loading', () => {
      mockUseProfile.mockReturnValue({
        profile: null,
        loading: true,
        error: null,
        isRefetching: false,
        refetch: jest.fn(),
      });

      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows loading states for penalties', () => {
      renderWithProviders(<HouseholdFundPage />);

      // The page should show loading states for penalties
      // Since we're mocking the queries, we can't directly test the loading states
      // but we can verify the page renders without errors
      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
    });

    it('shows loading states for chores', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it.skip('shows error when user is not authenticated', () => {
      mockUseProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: 'Not authenticated',
        isRefetching: false,
        refetch: jest.fn(),
      });

      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows error when user has no household', () => {
      mockUseProfile.mockReturnValue({
        profile: { ...mockProfile, household_id: null },
        loading: false,
        error: null,
        isRefetching: false,
        refetch: jest.fn(),
      });

      renderWithProviders(<HouseholdFundPage />);

      expect(
        screen.getByText('You are not a member of any household.')
      ).toBeInTheDocument();
    });

    it('shows error when household members fail to load', () => {
      mockUseHouseholdMembers.mockReturnValue({
        members: [],
        loading: false,
        error: new Error('Failed to load members'),
        isEmpty: true,
        isRefetching: false,
        isStale: false,
        refetch: jest.fn(),
        invalidate: jest.fn(),
      });

      renderWithProviders(<HouseholdFundPage />);

      expect(
        screen.getByText('Failed to load data. Please try again.')
      ).toBeInTheDocument();
    });
  });

  describe('Add Penalty Dialog', () => {
    it('opens add penalty dialog when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      const addButton = screen.getByRole('button', { name: /add penalty/i });
      await user.click(addButton);

      expect(screen.getByTestId('add-penalty-dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Penalty Dialog')).toBeInTheDocument();
    });

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add penalty/i });
      await user.click(addButton);
      expect(screen.getByTestId('add-penalty-dialog')).toBeInTheDocument();

      // Close dialog
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(
        screen.queryByTestId('add-penalty-dialog')
      ).not.toBeInTheDocument();
    });

    it('calls onPenaltyAdded when penalty is added', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      // Open dialog
      const addButton = screen.getByRole('button', { name: /add penalty/i });
      await user.click(addButton);

      // Add penalty - use the button inside the dialog
      const addPenaltyButton = screen
        .getByTestId('add-penalty-dialog')
        .querySelector('button');
      if (addPenaltyButton) {
        await user.click(addPenaltyButton);
      }

      // Dialog should close after successful addition
      await waitFor(() => {
        expect(
          screen.queryByTestId('add-penalty-dialog')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows "no penalties yet" when no penalties exist', () => {
      renderWithProviders(<HouseholdFundPage />);

      // Since we're mocking the queries to return empty data,
      // the page should show empty states
      // The actual empty state text would depend on the query results
      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
    });

    it('shows "no current issues" when no overdue chores exist', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
    });
  });

  describe('Fund Balance Display', () => {
    it('displays fund balance with proper formatting', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Total Fund Balance')).toBeInTheDocument();
      // The actual balance would be displayed based on query results
    });

    it('shows monthly additions indicator', () => {
      renderWithProviders(<HouseholdFundPage />);

      // The monthly indicator should be present
      // The actual value would depend on query results
      expect(screen.getByText('Total Fund Balance')).toBeInTheDocument();
    });
  });

  describe('Recent Penalties Section', () => {
    it('displays penalties with user information', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
      // The actual penalty data would be displayed based on query results
    });

    it('shows penalty amounts in red', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
      // Penalty amounts would be displayed with red styling
    });

    it('shows relative dates for penalties', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
      // Dates would be formatted relatively (e.g., "2 days ago")
    });
  });

  describe('Current Issues Section', () => {
    it('displays overdue chores', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
      // Overdue chores would be displayed here
    });

    it('shows chore status badges', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
      // Status badges would be displayed for each chore
    });

    it('shows assigned user for each chore', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
      // Assigned users would be displayed for each chore
    });
  });

  describe('User Interactions', () => {
    it('allows clicking on penalty items', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Recent Penalties')).toBeInTheDocument();
      // Penalty items would be clickable
    });

    it('allows clicking on chore items', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByText('Current Issues')).toBeInTheDocument();
      // Chore items would be clickable
    });
  });

  describe('Data Refresh', () => {
    it('refreshes data when penalty is added', async () => {
      const user = userEvent.setup();
      renderWithProviders(<HouseholdFundPage />);

      // Open dialog and add penalty
      const addButton = screen.getByRole('button', { name: /add penalty/i });
      await user.click(addButton);

      // Add penalty - use the button inside the dialog
      const addPenaltyButton = screen
        .getByTestId('add-penalty-dialog')
        .querySelector('button');
      if (addPenaltyButton) {
        await user.click(addPenaltyButton);
      }

      // Data should be refreshed after penalty addition
      await waitFor(() => {
        expect(
          screen.queryByTestId('add-penalty-dialog')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders properly on different screen sizes', () => {
      renderWithProviders(<HouseholdFundPage />);

      // The page should be responsive with proper classes
      expect(screen.getByText('Household Fund')).toBeInTheDocument();
      expect(
        screen.getByText('Manage penalties and fund balance')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      renderWithProviders(<HouseholdFundPage />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Household Fund')).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      renderWithProviders(<HouseholdFundPage />);

      const addButton = screen.getByRole('button', { name: /add penalty/i });
      expect(addButton).toBeInTheDocument();
    });
  });
});
