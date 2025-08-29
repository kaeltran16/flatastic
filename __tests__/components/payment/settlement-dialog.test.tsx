import SettlementDialog from '@/components/payment/settlement-dialog';
import { Balance } from '@/lib/supabase/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock motion components
jest.mock('motion/react', () => ({
  AnimatePresence: ({ children }: any) => children,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUser1 = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  household_id: 'household-1',
  payment_link: 'https://pay.example.com/john',
};

const mockUser2 = {
  id: 'user-2',
  name: 'Jane Smith',
  email: 'jane@example.com',
  household_id: 'household-1',
  payment_link: 'https://pay.example.com/jane',
};

const mockBalance: Balance = {
  fromUser: mockUser1,
  toUser: mockUser2,
  amount: 150.0,
  related_splits: [
    {
      id: 'split-1',
      amount_owed: 100.0,
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
};

const mockOnSettle = jest.fn();
const mockOnOpenChange = jest.fn();

describe('SettlementDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders dialog when open is true', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.getByText('Record Payment')).toBeInTheDocument();
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      render(
        <SettlementDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.queryByText('Record Payment')).not.toBeInTheDocument();
    });

    it('displays balance information correctly', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders payment amount input with correct default value', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).toHaveValue('150');
    });

    it('renders payment note textarea', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const noteTextarea = screen.getByLabelText(/payment note/i);
      expect(noteTextarea).toBeInTheDocument();
    });

    it('renders payment method tabs', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(
        screen.getByRole('tab', { name: /digital payment/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /cash/i })).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /bank transfer/i })
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for invalid payment amount (negative)', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '-10');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(toast.error).toHaveBeenCalledWith('Invalid amount', {
        description:
          'Payment amount must be between $0 and the total owed amount.',
      });
    });

    it('shows error for payment amount exceeding balance', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '200');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(toast.error).toHaveBeenCalledWith('Invalid amount', {
        description:
          'Payment amount must be between $0 and the total owed amount.',
      });
    });

    it('shows error for zero payment amount', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '0');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(toast.error).toHaveBeenCalledWith('Invalid amount', {
        description:
          'Payment amount must be between $0 and the total owed amount.',
      });
    });

    it('allows valid payment amount', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '75');

      const noteTextarea = screen.getByLabelText(/payment note/i);
      await user.type(noteTextarea, 'Partial payment for groceries');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(mockOnSettle).toHaveBeenCalledWith(
        mockBalance,
        75,
        'Partial payment for groceries'
      );
    });
  });

  describe('Payment Processing', () => {
    it('calls onSettle with correct parameters when form is submitted', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '100');

      const noteTextarea = screen.getByLabelText(/payment note/i);
      await user.type(noteTextarea, 'Payment via Venmo');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(mockOnSettle).toHaveBeenCalledWith(
        mockBalance,
        100,
        'Payment via Venmo'
      );
    });

    it('shows success toast when payment is processed successfully', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      mockOnSettle.mockResolvedValue(undefined);

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Payment settled!', {
          description: '$50.00 payment recorded successfully.',
        });
      });
    });

    it('shows error toast when payment processing fails', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      mockOnSettle.mockRejectedValue(new Error('Payment failed'));

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error settling payment', {
          description: 'Failed to record payment. Please try again.',
        });
      });
    });

    it('closes dialog after successful payment', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      mockOnSettle.mockResolvedValue(undefined);

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('resets form after successful payment', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      mockOnSettle.mockResolvedValue(undefined);

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const noteTextarea = screen.getByLabelText(/payment note/i);
      await user.type(noteTextarea, 'Test payment');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      await waitFor(() => {
        expect(amountInput).toHaveValue('150'); // Reset to original balance amount
        expect(noteTextarea).toHaveValue(''); // Reset to empty
      });
    });
  });

  describe('Dialog Controls', () => {
    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('closes dialog when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Payment Method Tabs', () => {
    it('switches between payment method tabs', async () => {
      const user = userEvent.setup();

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const cashTab = screen.getByRole('tab', { name: /cash/i });
      await user.click(cashTab);

      expect(screen.getByText('Cash Payment')).toBeInTheDocument();

      const bankTab = screen.getByRole('tab', { name: /bank transfer/i });
      await user.click(bankTab);

      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });

    it('shows different content for each payment method', async () => {
      const user = userEvent.setup();

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      // Digital payment (default)
      expect(screen.getByText('Digital Payment')).toBeInTheDocument();

      // Cash payment
      const cashTab = screen.getByRole('tab', { name: /cash/i });
      await user.click(cashTab);
      expect(screen.getByText('Cash Payment')).toBeInTheDocument();

      // Bank transfer
      const bankTab = screen.getByRole('tab', { name: /bank transfer/i });
      await user.click(bankTab);
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during payment processing', async () => {
      const user = userEvent.setup();

      // Mock a delayed settlement
      mockOnSettle.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(settleButton).toBeDisabled();
    });

    it('enables button after payment processing completes', async () => {
      const user = userEvent.setup();

      mockOnSettle.mockResolvedValue(undefined);

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      await waitFor(() => {
        expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null selectedBalance gracefully', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={null}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.getByText('Record Payment')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('handles balance with no payment link', () => {
      const balanceWithoutLink = {
        ...mockBalance,
        payment_link: '',
      };

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={balanceWithoutLink}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.getByText('Record Payment')).toBeInTheDocument();
    });

    it('handles decimal amounts correctly', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const amountInput = screen.getByLabelText(/payment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '75.50');

      const settleButton = screen.getByRole('button', {
        name: /record payment/i,
      });
      await user.click(settleButton);

      expect(mockOnSettle).toHaveBeenCalledWith(mockBalance, 75.5, '');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(screen.getByLabelText(/payment amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment note/i)).toBeInTheDocument();
    });

    it('has proper dialog role and aria attributes', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(
        <SettlementDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedBalance={mockBalance}
          currentUserId="user-1"
          onSettle={mockOnSettle}
        />
      );

      expect(
        screen.getByRole('button', { name: /record payment/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });
  });
});
