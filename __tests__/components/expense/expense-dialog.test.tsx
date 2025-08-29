import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpenseDialog from '@/components/expense/expense-dialog';

// Mock dependencies
jest.mock('@/hooks/use-expense');
jest.mock('@/hooks/use-household-member');
jest.mock('@/hooks/use-profile');

const mockMembers = [
  { 
    id: 'user-1', 
    full_name: 'Test User', 
    email: 'test@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: 'household-1',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: 'user-2', 
    full_name: 'User Two', 
    email: 'user2@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: 'household-1',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: 'user-3', 
    full_name: 'User Three', 
    email: 'user3@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: 'household-1',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
];

const mockCurrentUser = {
  id: 'user-1',
  household_id: 'household-1',
  email: 'test@example.com',
  full_name: 'Test User',
};

const defaultProps = {
  mode: 'create' as const,
  householdId: 'household-1',
  currentUserId: 'user-1',
  householdMembers: mockMembers,
  onSubmit: jest.fn(),
  isLoading: false,
  className: 'test-class',
};

describe('ExpenseDialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('should render create mode dialog correctly', () => {
      render(<ExpenseDialog {...defaultProps} />);

      // Check that the trigger button is rendered
      expect(screen.getByText('Add Expense')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render edit mode dialog correctly', () => {
      const editProps = {
        ...defaultProps,
        mode: 'edit' as const,
        expense: {
          id: 'expense-1',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: 'user-1',
          household_id: 'household-1',
          split_type: 'equal' as const,
          splits: [
            { user_id: 'user-1', amount_owed: 50, is_settled: false },
            { user_id: 'user-2', amount_owed: 50, is_settled: false },
          ],
          status: 'pending' as const,
          payer: mockMembers[0],
          your_share: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      render(<ExpenseDialog {...editProps} />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<ExpenseDialog {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByText('Add Expense');
      expect(submitButton).toBeDisabled();
    });

    it('should render with custom button text', () => {
      render(<ExpenseDialog {...defaultProps} buttonText="Custom Text" />);

      expect(screen.getByText('Custom Text')).toBeInTheDocument();
    });

    it('should render with children instead of default button', () => {
      render(
        <ExpenseDialog {...defaultProps}>
          <button>Custom Trigger</button>
        </ExpenseDialog>
      );

      expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
      expect(screen.queryByText('Add Expense')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Opening and Closing', () => {
    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpenseDialog {...defaultProps} />);

      const triggerButton = screen.getByText('Add Expense');
      await user.click(triggerButton);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCancel = jest.fn();
      
      render(<ExpenseDialog {...defaultProps} onOpenChange={mockOnCancel} />);

      // Open dialog
      const triggerButton = screen.getByText('Add Expense');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });

      // Find and click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Add New Expense')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      render(<ExpenseDialog {...defaultProps} onSubmit={mockOnSubmit} />);

      // Open dialog
      const triggerButton = screen.getByText('Add Expense');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });

      // Fill form fields
      const descriptionInput = screen.getByPlaceholderText(/description/i);
      await user.type(descriptionInput, 'Test Expense');

      const amountInput = screen.getByPlaceholderText(/amount/i);
      await user.type(amountInput, '100');

      // Select category
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      const foodOption = screen.getByText('Food');
      await user.click(foodOption);

      // Select users for equal split
      const userCheckboxes = screen.getAllByRole('checkbox');
      await user.click(userCheckboxes[1]); // Select user-2

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should handle submission errors gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'));
      
      render(<ExpenseDialog {...defaultProps} onSubmit={mockOnSubmit} />);

      // Open dialog
      const triggerButton = screen.getByText('Add Expense');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });

      // Fill form and submit
      const descriptionInput = screen.getByPlaceholderText(/description/i);
      await user.type(descriptionInput, 'Test Expense');

      const amountInput = screen.getByPlaceholderText(/amount/i);
      await user.type(amountInput, '100');

      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      const foodOption = screen.getByText('Food');
      await user.click(foodOption);

      const userCheckboxes = screen.getAllByRole('checkbox');
      await user.click(userCheckboxes[1]);

      const submitButton = screen.getByRole('button', { name: /add expense/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Dialog should remain open on error
      expect(screen.getByText('Add New Expense')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with existing expense data', async () => {
      const user = userEvent.setup();
      const editProps = {
        ...defaultProps,
        mode: 'edit' as const,
        expense: {
          id: 'expense-1',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: 'user-1',
          household_id: 'household-1',
          split_type: 'equal' as const,
          splits: [
            { user_id: 'user-1', amount_owed: 50, is_settled: false },
            { user_id: 'user-2', amount_owed: 50, is_settled: false },
          ],
          status: 'pending' as const,
          payer: mockMembers[0],
          your_share: 50,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      render(<ExpenseDialog {...editProps} />);

      // Open dialog
      const triggerButton = screen.getByText('Edit');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Expense')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Expense')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      });
    });

    it('should handle custom split in edit mode', async () => {
      const user = userEvent.setup();
      const editProps = {
        ...defaultProps,
        mode: 'edit' as const,
        expense: {
          id: 'expense-1',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: 'user-1',
          household_id: 'household-1',
          split_type: 'custom' as const,
          splits: [
            { user_id: 'user-2', amount_owed: 60, is_settled: false },
            { user_id: 'user-3', amount_owed: 40, is_settled: false },
          ],
          status: 'pending' as const,
          payer: mockMembers[0],
          your_share: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      render(<ExpenseDialog {...editProps} />);

      // Open dialog
      const triggerButton = screen.getByText('Edit');
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Expense')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Expense')).toBeInTheDocument();
      });
    });
  });

  describe('Controlled Mode', () => {
    it('should work in controlled mode', async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      
      render(
        <ExpenseDialog 
          {...defaultProps} 
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      );

      // Dialog should be open
      expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      
      // No trigger button should be rendered in controlled mode
      expect(screen.queryByText('Add Expense')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should validate required props for create mode', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <ExpenseDialog 
          {...defaultProps} 
          householdId={undefined}
          currentUserId={undefined}
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'ExpenseDialog: householdId and currentUserId are required for create mode'
      );
      
      consoleSpy.mockRestore();
    });

    it('should validate required props for edit mode', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <ExpenseDialog 
          {...defaultProps} 
          mode="edit"
          expense={undefined}
        />
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'ExpenseDialog: expense is required for edit mode'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ExpenseDialog {...defaultProps} />);

      const triggerButton = screen.getByText('Add Expense');
      expect(triggerButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ExpenseDialog {...defaultProps} />);

      const triggerButton = screen.getByText('Add Expense');
      
      // Focus the button
      triggerButton.focus();
      expect(triggerButton).toHaveFocus();

      // Open dialog with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });
    });
  });

  describe('Ref Methods', () => {
    it('should expose open and close methods via ref', async () => {
      const ref = React.createRef<any>();
      render(<ExpenseDialog {...defaultProps} ref={ref} />);

      // Initially dialog should be closed
      expect(screen.queryByText('Add New Expense')).not.toBeInTheDocument();

      // Open dialog using ref
      ref.current?.open();

      await waitFor(() => {
        expect(screen.getByText('Add New Expense')).toBeInTheDocument();
      });

      // Close dialog using ref
      ref.current?.close();

      await waitFor(() => {
        expect(screen.queryByText('Add New Expense')).not.toBeInTheDocument();
      });
    });
  });
});
