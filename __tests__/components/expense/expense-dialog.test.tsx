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
    id: '00000000-0000-0000-0000-000000000001', 
    full_name: 'Test User', 
    email: 'test@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: '00000000-0000-0000-0000-000000000010',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: '00000000-0000-0000-0000-000000000002', 
    full_name: 'User Two', 
    email: 'user2@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: '00000000-0000-0000-0000-000000000010',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
  { 
    id: '00000000-0000-0000-0000-000000000003', 
    full_name: 'User Three', 
    email: 'user3@example.com',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    household_id: '00000000-0000-0000-0000-000000000010',
    payment_link: null,
    updated_at: '2024-01-01T00:00:00Z'
  },
];

const mockCurrentUser = {
  id: '00000000-0000-0000-0000-000000000001',
  household_id: '00000000-0000-0000-0000-000000000010',
  email: 'test@example.com',
  full_name: 'Test User',
};

const defaultProps = {
  mode: 'create' as const,
  householdId: '00000000-0000-0000-0000-000000000010',
  currentUserId: '00000000-0000-0000-0000-000000000001',
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
          id: '00000000-0000-0000-0000-000000000100',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: '00000000-0000-0000-0000-000000000001',
          household_id: '00000000-0000-0000-0000-000000000010',
          split_type: 'equal' as const,
          splits: [
            { user_id: '00000000-0000-0000-0000-000000000001', amount_owed: 50, is_settled: false },
            { user_id: '00000000-0000-0000-0000-000000000002', amount_owed: 50, is_settled: false },
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
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test Expense');

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '100');

      // Select category
      // Two comboboxes exist (category, split_type); category is first in DOM.
      const categorySelect = screen.getAllByRole('combobox')[0];
      await user.click(categorySelect);
      // Use the Radix SelectItem (role=option), not the hidden native <option>.
      const foodOption = screen.getByRole('option', { name: 'Food' });
      await user.click(foodOption);

      // Equal-split mode auto-splits across all household members; no
      // per-user checkbox UI is rendered in this branch.

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
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'Test Expense');

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '100');

      // Two comboboxes exist (category, split_type); category is first in DOM.
      const categorySelect = screen.getAllByRole('combobox')[0];
      await user.click(categorySelect);
      // Use the Radix SelectItem (role=option), not the hidden native <option>.
      const foodOption = screen.getByRole('option', { name: 'Food' });
      await user.click(foodOption);

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
          id: '00000000-0000-0000-0000-000000000100',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: '00000000-0000-0000-0000-000000000001',
          household_id: '00000000-0000-0000-0000-000000000010',
          split_type: 'equal' as const,
          splits: [
            { user_id: '00000000-0000-0000-0000-000000000001', amount_owed: 50, is_settled: false },
            { user_id: '00000000-0000-0000-0000-000000000002', amount_owed: 50, is_settled: false },
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
          id: '00000000-0000-0000-0000-000000000100',
          description: 'Test Expense',
          amount: 100,
          category: 'Food',
          date: '2024-01-01',
          paid_by: '00000000-0000-0000-0000-000000000001',
          household_id: '00000000-0000-0000-0000-000000000010',
          split_type: 'custom' as const,
          splits: [
            { user_id: '00000000-0000-0000-0000-000000000002', amount_owed: 60, is_settled: false },
            { user_id: '00000000-0000-0000-0000-000000000003', amount_owed: 40, is_settled: false },
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

      // No trigger button should be rendered in controlled mode.
      // Filter by aria-expanded to distinguish the Radix trigger from the
      // form's submit button (which also reads "Add Expense").
      expect(
        screen.queryByRole('button', { name: 'Add Expense', expanded: false })
      ).not.toBeInTheDocument();
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
