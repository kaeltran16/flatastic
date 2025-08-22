import ChoresPage from '@/app/chores/page';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<
  typeof useQueryClient
>;

// Mock data
const mockCurrentUser = {
  id: 'user-1',
  email: 'test@example.com',
  household_id: 'household-1',
};

const mockHousehold = {
  id: 'household-1',
  name: 'Test Household',
  created_by: 'user-1',
};

const mockHouseholdMembers = [
  {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    household_id: 'household-1',
  },
  {
    id: 'user-2',
    email: 'member2@example.com',
    full_name: 'Member Two',
    household_id: 'household-1',
  },
];

const mockChores = [
  {
    id: 'chore-1',
    name: 'Clean Kitchen',
    description: 'Deep clean the kitchen',
    assigned_to: 'user-1',
    due_date: '2025-01-25',
    status: 'pending' as const,
    recurring_type: 'weekly' as const,
    recurring_interval: 1,
    household_id: 'household-1',
    created_by: 'user-1',
    created_at: '2025-01-20',
    updated_at: '2025-01-20',
  },
  {
    id: 'chore-2',
    name: 'Take Out Trash',
    description: null,
    assigned_to: 'user-2',
    due_date: '2025-01-22',
    status: 'overdue' as const,
    recurring_type: 'none' as const,
    recurring_interval: null,
    household_id: 'household-1',
    created_by: 'user-1',
    created_at: '2025-01-15',
    updated_at: '2025-01-15',
  },
  {
    id: 'chore-3',
    name: 'Vacuum Living Room',
    description: 'Vacuum the main living area',
    assigned_to: 'user-1',
    due_date: '2025-01-18',
    status: 'completed' as const,
    recurring_type: 'none' as const,
    recurring_interval: null,
    household_id: 'household-1',
    created_by: 'user-2',
    created_at: '2025-01-10',
    updated_at: '2025-01-18',
  },
];

const mockQueryClient = {
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
};

describe('Chores Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default query mocks
    mockUseQuery.mockImplementation((options: any) => {
      if (options.queryKey.includes('currentUser')) {
        return {
          data: mockCurrentUser,
          isLoading: false,
          error: null,
        };
      }
      if (options.queryKey.includes('household')) {
        return {
          data: mockHousehold,
          isLoading: false,
          error: null,
        };
      }
      if (options.queryKey.includes('householdMembers')) {
        return {
          data: mockHouseholdMembers,
          isLoading: false,
          error: null,
        };
      }
      if (options.queryKey.includes('chores')) {
        return {
          data: mockChores,
          isLoading: false,
          error: null,
        };
      }
      return { data: null, isLoading: false, error: null };
    });

    mockUseMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
    } as any);

    mockUseQueryClient.mockReturnValue(mockQueryClient as any);
  });

  it('renders the chores page with correct structure', () => {
    render(<ChoresPage />);

    expect(screen.getByText('Household Chores')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Manage and track all household tasks for Test Household/
      )
    ).toBeInTheDocument();
  });

  it('displays chore statistics correctly', () => {
    render(<ChoresPage />);

    // Should show stats based on mockChores
    // 1 pending, 1 overdue, 1 completed
    expect(screen.getByText('Clean Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Take Out Trash')).toBeInTheDocument();
    expect(screen.getByText('Vacuum Living Room')).toBeInTheDocument();
  });

  it('filters chores by assignee', async () => {
    const user = userEvent.setup();
    render(<ChoresPage />);

    // Find and interact with assignee filter
    const assigneeFilter = screen.getByRole('combobox', { name: /assignee/i });
    await user.click(assigneeFilter);

    // Should show options for filtering
    expect(screen.getByText('All Members')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Member Two')).toBeInTheDocument();
  });

  it('filters chores by status', async () => {
    const user = userEvent.setup();
    render(<ChoresPage />);

    // Find and interact with status filter
    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    await user.click(statusFilter);

    // Should show status options
    expect(screen.getByText('All Status')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('opens create chore dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChoresPage />);

    const addButton = screen.getByRole('button', { name: /add chore/i });
    await user.click(addButton);

    expect(screen.getByText('Create New Chore')).toBeInTheDocument();
    expect(screen.getByLabelText(/chore name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('creates a new chore successfully', async () => {
    const mockCreateChore = jest.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue({
      mutateAsync: mockCreateChore,
      isPending: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ChoresPage />);

    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add chore/i });
    await user.click(addButton);

    // Fill form
    await user.type(screen.getByLabelText(/chore name/i), 'Test Chore');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create chore/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateChore).toHaveBeenCalled();
    });
  });

  it('marks chore as complete', async () => {
    const mockMarkComplete = jest.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMarkComplete,
      isPending: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ChoresPage />);

    // Find a pending chore's complete button
    const completeButton = screen.getByRole('button', {
      name: /mark.*complete/i,
    });
    await user.click(completeButton);

    await waitFor(() => {
      expect(mockMarkComplete).toHaveBeenCalledWith('chore-1');
    });
  });

  it('edits an existing chore', async () => {
    const mockUpdateChore = jest.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue({
      mutateAsync: mockUpdateChore,
      isPending: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ChoresPage />);

    // Find and click edit button for a chore
    const editButton = screen.getByRole('button', {
      name: /edit.*clean kitchen/i,
    });
    await user.click(editButton);

    // Should open edit dialog
    expect(screen.getByText('Edit Chore')).toBeInTheDocument();

    // Modify chore name
    const nameInput = screen.getByDisplayValue('Clean Kitchen');
    await user.clear(nameInput);
    await user.type(nameInput, 'Deep Clean Kitchen');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateChore).toHaveBeenCalled();
    });
  });

  it('deletes a chore with confirmation', async () => {
    const mockDeleteChore = jest.fn().mockResolvedValue({ success: true });
    mockUseMutation.mockReturnValue({
      mutateAsync: mockDeleteChore,
      isPending: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<ChoresPage />);

    // Find and click delete button
    const deleteButton = screen.getByRole('button', {
      name: /delete.*clean kitchen/i,
    });
    await user.click(deleteButton);

    // Should show confirmation dialog
    expect(
      screen.getByText('Are you sure you want to delete this chore?')
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteChore).toHaveBeenCalledWith('chore-1');
    });
  });

  it('handles loading states correctly', () => {
    mockUseQuery.mockImplementation((options: any) => ({
      data: null,
      isLoading: true,
      error: null,
    }));

    render(<ChoresPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error states correctly', () => {
    mockUseQuery.mockImplementation((options: any) => ({
      data: null,
      isLoading: false,
      error: { message: 'Failed to load chores' },
    }));

    render(<ChoresPage />);

    expect(screen.getByText('Failed to load chores')).toBeInTheDocument();
  });

  it('shows setup required state when user has no household', () => {
    mockUseQuery.mockImplementation((options: any) => {
      if (options.queryKey.includes('currentUser')) {
        return {
          data: { ...mockCurrentUser, household_id: null },
          isLoading: false,
          error: null,
        };
      }
      return { data: null, isLoading: false, error: null };
    });

    render(<ChoresPage />);

    expect(screen.getByText('Setup Required')).toBeInTheDocument();
  });

  it('validates chore form inputs', async () => {
    const user = userEvent.setup();
    render(<ChoresPage />);

    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add chore/i });
    await user.click(addButton);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /create chore/i });
    await user.click(submitButton);

    // Should show validation errors
    expect(screen.getByText('Chore name is required')).toBeInTheDocument();
  });

  it('displays recurring chore settings correctly', async () => {
    const user = userEvent.setup();
    render(<ChoresPage />);

    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add chore/i });
    await user.click(addButton);

    // Set recurring type
    const recurringSelect = screen.getByLabelText(/recurring type/i);
    await user.selectOptions(recurringSelect, 'weekly');

    // Should show interval input
    expect(screen.getByLabelText(/recurring interval/i)).toBeInTheDocument();
  });
});
