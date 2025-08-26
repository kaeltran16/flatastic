import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseForm from '@/components/expense/expense-form'

// Mock data
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
]

const mockProps = {
  mode: 'create' as const,
  householdId: 'household-1',
  householdMembers: mockHouseholdMembers,
  currentUserId: 'user-1',
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  isLoading: false,
}

describe('ExpenseForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders create form correctly', () => {
    render(<ExpenseForm {...mockProps} />)
    
    expect(screen.getByText('Add New Expense')).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/split type/i)).toBeInTheDocument()
  })

  it('renders edit form with initial data correctly', () => {
    const editProps = {
      ...mockProps,
      mode: 'edit' as const,
      initialData: {
        description: 'Test Expense',
        amount: 100.50,
        category: 'groceries' as const,
        date: '2025-01-20',
        split_type: 'equal' as const,
      },
    }

    render(<ExpenseForm {...editProps} />)
    
    expect(screen.getByText('Edit Expense')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Expense')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100.50')).toBeInTheDocument()
    expect(screen.getByDisplayValue('groceries')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-01-20')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('Amount is required')).toBeInTheDocument()
    })
  })

  it('validates amount is greater than 0', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    await user.type(descriptionInput, 'Test Expense')
    await user.type(amountInput, '0')
    
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
    })
  })

  it('validates description length', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    const amountInput = screen.getByLabelText(/amount/i)
    
    // Test description too long
    const longDescription = 'a'.repeat(201)
    await user.type(descriptionInput, longDescription)
    await user.type(amountInput, '50.00')
    
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Description too long')).toBeInTheDocument()
    })
  })

  it('validates date format', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    const amountInput = screen.getByLabelText(/amount/i)
    const dateInput = screen.getByLabelText(/date/i)
    
    await user.type(descriptionInput, 'Test Expense')
    await user.type(amountInput, '50.00')
    await user.type(dateInput, 'invalid-date')
    
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid date')).toBeInTheDocument()
    })
  })

  it('shows custom split options when split type is custom', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    const splitTypeSelect = screen.getByLabelText(/split type/i)
    await user.selectOptions(splitTypeSelect, 'custom')
    
    // Should show custom split section
    expect(screen.getByText('Custom Split')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Member Two')).toBeInTheDocument()
  })

  it('validates custom split amounts equal total', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    // Fill basic fields
    await user.type(screen.getByLabelText(/description/i), 'Custom Split Expense')
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    await user.selectOptions(screen.getByLabelText(/category/i), 'food')
    await user.type(screen.getByLabelText(/date/i), '2025-01-20')
    
    // Select custom split
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    // Set custom amounts that don't add up to total
    const user1Checkbox = screen.getByLabelText(/include test user/i)
    const user2Checkbox = screen.getByLabelText(/include member two/i)
    
    await user.click(user1Checkbox)
    await user.click(user2Checkbox)
    
    const user1AmountInput = screen.getByLabelText(/test user.*amount/i)
    const user2AmountInput = screen.getByLabelText(/member two.*amount/i)
    
    await user.type(user1AmountInput, '30.00')
    await user.type(user2AmountInput, '40.00') // Total = 70, but expense is 100
    
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Custom split amounts must equal the total expense amount')).toBeInTheDocument()
    })
  })

  it('submits form with equal split correctly', async () => {
    const user = userEvent.setup()
    const onSubmitMock = jest.fn().mockResolvedValue(undefined)
    
    render(<ExpenseForm {...mockProps} onSubmit={onSubmitMock} />)
    
    // Fill form
    await user.type(screen.getByLabelText(/description/i), 'Grocery Shopping')
    await user.type(screen.getByLabelText(/amount/i), '120.50')
    await user.selectOptions(screen.getByLabelText(/category/i), 'groceries')
    await user.type(screen.getByLabelText(/date/i), '2025-01-20')
    // Split type defaults to 'equal'
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Grocery Shopping',
          amount: 120.50,
          category: 'groceries',
          date: '2025-01-20',
          split_type: 'equal',
          household_id: 'household-1',
        })
      )
    })
  })

  it('submits form with custom split correctly', async () => {
    const user = userEvent.setup()
    const onSubmitMock = jest.fn().mockResolvedValue(undefined)
    
    render(<ExpenseForm {...mockProps} onSubmit={onSubmitMock} />)
    
    // Fill basic fields
    await user.type(screen.getByLabelText(/description/i), 'Custom Split Expense')
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    await user.selectOptions(screen.getByLabelText(/category/i), 'food')
    await user.type(screen.getByLabelText(/date/i), '2025-01-20')
    
    // Select custom split
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    // Set custom amounts
    const user1Checkbox = screen.getByLabelText(/include test user/i)
    const user2Checkbox = screen.getByLabelText(/include member two/i)
    
    await user.click(user1Checkbox)
    await user.click(user2Checkbox)
    
    const user1AmountInput = screen.getByLabelText(/test user.*amount/i)
    const user2AmountInput = screen.getByLabelText(/member two.*amount/i)
    
    await user.type(user1AmountInput, '60.00')
    await user.type(user2AmountInput, '40.00')
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Custom Split Expense',
          amount: 100.00,
          category: 'food',
          split_type: 'custom',
          custom_splits: [
            { user_id: 'user-1', amount: 60.00 },
            { user_id: 'user-2', amount: 40.00 },
          ],
          selected_users: ['user-1', 'user-2'],
        })
      )
    })
  })

  it('handles form submission errors gracefully', async () => {
    const user = userEvent.setup()
    const onSubmitMock = jest.fn().mockRejectedValue(new Error('Submission failed'))
    
    render(<ExpenseForm {...mockProps} onSubmit={onSubmitMock} />)
    
    // Fill required fields
    await user.type(screen.getByLabelText(/description/i), 'Test Expense')
    await user.type(screen.getByLabelText(/amount/i), '50.00')
    await user.selectOptions(screen.getByLabelText(/category/i), 'other')
    await user.type(screen.getByLabelText(/date/i), '2025-01-20')
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled()
    })
    
    // Form should remain open after error
    expect(screen.getByText('Add New Expense')).toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    render(<ExpenseForm {...mockProps} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /adding/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancelMock = jest.fn()
    
    render(<ExpenseForm {...mockProps} onCancel={onCancelMock} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onCancelMock).toHaveBeenCalled()
  })

  it('displays all expense categories in dropdown', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    const categorySelect = screen.getByLabelText(/category/i)
    
    // Check that all category options are available
    expect(screen.getByRole('option', { name: 'groceries' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'utilities' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'household' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'food' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'transportation' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'entertainment' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'other' })).toBeInTheDocument()
  })

  it('automatically selects users in custom split when checkbox is checked', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    // Select custom split
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    // Check user checkbox
    const user1Checkbox = screen.getByLabelText(/include test user/i)
    await user.click(user1Checkbox)
    
    // Amount input for that user should become visible/enabled
    expect(screen.getByLabelText(/test user.*amount/i)).toBeInTheDocument()
  })

  it('validates that at least one user is selected for custom split', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    // Fill basic fields
    await user.type(screen.getByLabelText(/description/i), 'Custom Split Test')
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    await user.selectOptions(screen.getByLabelText(/category/i), 'food')
    await user.type(screen.getByLabelText(/date/i), '2025-01-20')
    
    // Select custom split but don't select any users
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Custom splits and selected users are required for custom split type')).toBeInTheDocument()
    })
  })

  it('updates total when custom split amounts change', async () => {
    const user = userEvent.setup()
    render(<ExpenseForm {...mockProps} />)
    
    // Fill amount
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    
    // Select custom split
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    // Select users and set amounts
    const user1Checkbox = screen.getByLabelText(/include test user/i)
    const user2Checkbox = screen.getByLabelText(/include member two/i)
    
    await user.click(user1Checkbox)
    await user.click(user2Checkbox)
    
    const user1AmountInput = screen.getByLabelText(/test user.*amount/i)
    const user2AmountInput = screen.getByLabelText(/member two.*amount/i)
    
    await user.type(user1AmountInput, '60.00')
    await user.type(user2AmountInput, '40.00')
    
    // Should show total of custom splits
    expect(screen.getByText(/total.*100\.00/i)).toBeInTheDocument()
  })
})