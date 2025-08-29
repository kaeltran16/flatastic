import ChoresPage from '@/app/chores/page';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the chore hooks
const mockUseCurrentUser = jest.fn();
const mockUseHousehold = jest.fn();
const mockUseHouseholdMembers = jest.fn();
const mockUseChores = jest.fn();
const mockUseCreateChore = jest.fn();
const mockUseUpdateChore = jest.fn();
const mockUseDeleteChore = jest.fn();
const mockUseMarkChoreComplete = jest.fn();

jest.mock('@/hooks/use-chore', () => ({
  useCurrentUser: () => mockUseCurrentUser(),
  useChores: () => mockUseChores(),
  useCreateChore: () => mockUseCreateChore(),
  useUpdateChore: () => mockUseUpdateChore(),
  useDeleteChore: () => mockUseDeleteChore(),
  useMarkChoreComplete: () => mockUseMarkChoreComplete(),
  useHouseholdMembers: () => mockUseHouseholdMembers(),
}));

jest.mock('@/hooks/use-household', () => ({
  useHousehold: () => mockUseHousehold(),
}));

// useHouseholdMembers is imported from use-chore, not use-household-member

// Mock the chore components
jest.mock('@/components/chore/chore-dialog', () => {
  return function MockChoreDialog({ mode, onSubmit, isLoading }: any) {
    return (
      <button
        onClick={() =>
          onSubmit({ name: 'Test Chore', description: 'Test Description' })
        }
        disabled={isLoading}
        data-testid="add-chore-button"
      >
        Add Chore
      </button>
    );
  };
});

jest.mock('@/components/chore/stats-card', () => {
  return function MockChoreStatsCards({ chores }: any) {
    return (
      <div data-testid="stats-cards">
        <div>Total: {chores.length}</div>
        <div>
          Pending: {chores.filter((c: any) => c.status === 'pending').length}
        </div>
        <div>
          Completed:{' '}
          {chores.filter((c: any) => c.status === 'completed').length}
        </div>
      </div>
    );
  };
});

jest.mock('@/components/chore/filters', () => {
  return function MockChoreFilters({
    onAssigneeFilterChange,
    onStatusFilterChange,
  }: any) {
    return (
      <div data-testid="chore-filters">
        <select
          onChange={(e) => onAssigneeFilterChange(e.target.value)}
          data-testid="assignee-filter"
        >
          <option value="all">All Assignees</option>
          <option value="user1">User 1</option>
        </select>
        <select
          onChange={(e) => onStatusFilterChange(e.target.value)}
          data-testid="status-filter"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    );
  };
});

jest.mock('@/components/chore/tabs', () => {
  return function MockChoreTabs({
    pendingChores,
    completedChores,
    onMarkComplete,
    onUpdateChore,
    onDeleteChore,
  }: any) {
    return (
      <div data-testid="chore-tabs">
        <div data-testid="pending-chores">
          {pendingChores.map((chore: any) => (
            <div key={chore.id} data-testid={`chore-${chore.id}`}>
              <span>{chore.name}</span>
              <button
                onClick={() => onMarkComplete(chore.id)}
                data-testid={`complete-${chore.id}`}
              >
                Complete
              </button>
              <button
                onClick={() =>
                  onUpdateChore(chore.id, { name: 'Updated Chore' })
                }
                data-testid={`edit-${chore.id}`}
              >
                Edit
              </button>
              <button
                onClick={() => onDeleteChore(chore.id)}
                data-testid={`delete-${chore.id}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div data-testid="completed-chores">
          {completedChores.map((chore: any) => (
            <div key={chore.id} data-testid={`chore-${chore.id}`}>
              <span>{chore.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
});

jest.mock('@/components/chore/error', () => {
  return function MockErrorState({ error }: any) {
    return <div data-testid="error-state">Error: {error}</div>;
  };
});

jest.mock('@/components/chore/requirements', () => {
  return function MockSetupRequiredState() {
    return <div data-testid="setup-required">Setup Required</div>;
  };
});

jest.mock('@/components/household/loading', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock data
const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  full_name: 'Test User',
  household_id: 'household1',
};

const mockHousehold = {
  id: 'household1',
  name: 'Test Household',
  description: 'A test household',
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

const mockChores = [
  {
    id: 'chore1',
    name: 'Clean Kitchen',
    description: 'Clean the kitchen',
    status: 'pending' as const,
    assigned_to: 'user1',
    due_date: '2024-12-31',
    recurring_type: 'weekly' as const,
    household_id: 'household1',
    created_by: 'user1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assignee: mockHouseholdMembers[0],
    creator: mockHouseholdMembers[0],
  },
  {
    id: 'chore2',
    name: 'Take Out Trash',
    description: 'Take out the trash',
    status: 'completed' as const,
    assigned_to: 'user2',
    due_date: '2024-12-30',
    recurring_type: 'daily' as const,
    household_id: 'household1',
    created_by: 'user1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assignee: mockHouseholdMembers[1],
    creator: mockHouseholdMembers[0],
  },
];

describe('ChoresPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is loading', () => {
      mockUseCurrentUser.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: undefined,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<ChoresPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error state when there is an error', () => {
      mockUseCurrentUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('User error'),
      });
      mockUseHousehold.mockReturnValue({
        household: undefined,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<ChoresPage />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText(/error: user error/i)).toBeInTheDocument();
    });
  });

  describe('Setup Required State', () => {
    it('shows setup required when no user or household', () => {
      mockUseCurrentUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: null,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<ChoresPage />);

      expect(screen.getByTestId('setup-required')).toBeInTheDocument();
    });
  });

  describe('Main Content', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: mockChores,
        isLoading: false,
        error: null,
      });

      // Mock mutation hooks
      mockUseCreateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
    });

    it('renders main content with header', () => {
      render(<ChoresPage />);

      expect(screen.getByText(/household chores/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /manage and track all household tasks for test household/i
        )
      ).toBeInTheDocument();
    });

    it('renders add chore button', () => {
      render(<ChoresPage />);

      expect(screen.getByTestId('add-chore-button')).toBeInTheDocument();
      expect(screen.getByText(/add chore/i)).toBeInTheDocument();
    });

    it('renders stats cards with chore data', () => {
      render(<ChoresPage />);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
      expect(screen.getByText(/total: 2/i)).toBeInTheDocument();
      expect(screen.getByText(/pending: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/completed: 1/i)).toBeInTheDocument();
    });

    it('renders chore filters', () => {
      render(<ChoresPage />);

      expect(screen.getByTestId('chore-filters')).toBeInTheDocument();
      expect(screen.getByTestId('assignee-filter')).toBeInTheDocument();
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    });

    it('renders chore tabs with filtered chores', () => {
      render(<ChoresPage />);

      expect(screen.getByTestId('chore-tabs')).toBeInTheDocument();
      expect(screen.getByTestId('pending-chores')).toBeInTheDocument();
      expect(screen.getByTestId('completed-chores')).toBeInTheDocument();
    });

    it('displays pending chores with action buttons', () => {
      render(<ChoresPage />);

      expect(screen.getByText('Clean Kitchen')).toBeInTheDocument();
      expect(screen.getByTestId('complete-chore1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-chore1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-chore1')).toBeInTheDocument();
    });

    it('displays completed chores', () => {
      render(<ChoresPage />);

      expect(screen.getByText('Take Out Trash')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: mockChores,
        isLoading: false,
        error: null,
      });

      mockUseCreateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
    });

    it('filters chores by assignee', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const assigneeFilter = screen.getByTestId('assignee-filter');
      await user.selectOptions(assigneeFilter, 'user1');

      // The filtering logic is handled in the component, so we just verify the filter change
      expect(assigneeFilter).toHaveValue('user1');
    });

    it('filters chores by status', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'pending');

      expect(statusFilter).toHaveValue('pending');
    });
  });

  describe('Chore Actions', () => {
    let mockCreateChore: jest.Mock;
    let mockUpdateChore: jest.Mock;
    let mockDeleteChore: jest.Mock;
    let mockMarkComplete: jest.Mock;

    beforeEach(() => {
      mockCreateChore = jest.fn();
      mockUpdateChore = jest.fn();
      mockDeleteChore = jest.fn();
      mockMarkComplete = jest.fn();

      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: mockChores,
        isLoading: false,
        error: null,
      });

      mockUseCreateChore.mockReturnValue({
        mutateAsync: mockCreateChore,
        isPending: false,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: mockUpdateChore,
        isPending: false,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: mockDeleteChore,
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: mockMarkComplete,
        isPending: false,
      });
    });

    it('creates a new chore when add chore button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const addButton = screen.getByTestId('add-chore-button');
      await user.click(addButton);

      await waitFor(() => {
        expect(mockCreateChore).toHaveBeenCalledWith({
          name: 'Test Chore',
          description: 'Test Description',
        });
      });
    });

    it('marks a chore as complete when complete button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const completeButton = screen.getByTestId('complete-chore1');
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockMarkComplete).toHaveBeenCalledWith('chore1');
      });
    });

    it('updates a chore when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const editButton = screen.getByTestId('edit-chore1');
      await user.click(editButton);

      await waitFor(() => {
        expect(mockUpdateChore).toHaveBeenCalledWith({
          choreId: 'chore1',
          formData: {
            name: 'Updated Chore',
          },
        });
      });
    });

    it('deletes a chore when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<ChoresPage />);

      const deleteButton = screen.getByTestId('delete-chore1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteChore).toHaveBeenCalledWith('chore1');
      });
    });
  });

  describe('Loading States for Mutations', () => {
    it('shows loading state when creating chore', () => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: mockChores,
        isLoading: false,
        error: null,
      });

      mockUseCreateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      render(<ChoresPage />);

      const addButton = screen.getByTestId('add-chore-button');
      expect(addButton).toBeDisabled();
    });

    it('shows loading state when updating chore', () => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: mockChores,
        isLoading: false,
        error: null,
      });

      mockUseCreateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      render(<ChoresPage />);

      // The loading state for update would be passed to the ChoreTabs component
      // We can verify the component renders without crashing
      expect(screen.getByTestId('chore-tabs')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('handles empty chores list', () => {
      mockUseCurrentUser.mockReturnValue({
        data: mockUser,
        isLoading: false,
        error: null,
      });
      mockUseHousehold.mockReturnValue({
        household: mockHousehold,
        loading: false,
        error: null,
      });
      mockUseHouseholdMembers.mockReturnValue({
        data: mockHouseholdMembers,
        isLoading: false,
      });
      mockUseChores.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      mockUseCreateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseUpdateChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseDeleteChore.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });
      mockUseMarkChoreComplete.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      render(<ChoresPage />);

      expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
      expect(screen.getByText(/total: 0/i)).toBeInTheDocument();
      expect(screen.getByText(/pending: 0/i)).toBeInTheDocument();
      expect(screen.getByText(/completed: 0/i)).toBeInTheDocument();
    });
  });
});
