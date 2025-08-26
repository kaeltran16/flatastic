import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ExpensesPage from '@/app/expenses/page'

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>

// Mock data
const mockCurrentUser = {
  id: 'user-1',
  email: 'test@example.com',
  household_id: 'household-1',
  full_name: 'Test User',
}

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

const mockExpenses = [
  {
    id: 'expense-1',
    description: 'Grocery Shopping',
    amount: 120.50,
    category: 'groceries' as const,
    date: '2025-01-20',
    split_type: 'equal' as const,
    paid_by: 'user-1',
    household_id: 'household-1',
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
    payer: {
      id: 'user-1',
      full_name: 'Test User',
      email: 'test@example.com',
    },
    expense_shares: [
      {
        id: 'share-1',
        expense_id: 'expense-1',
        user_id: 'user-1',
        amount: 60.25,
        paid: true,
      },
      {
        id: 'share-2',
        expense_id: 'expense-1',
        user_id: 'user-2',
        amount: 60.25,
        paid: false,
      },
    ],
  },
  {
    id: 'expense-2',
    description: 'Electricity Bill',
    amount: 89.00,
    category: 'utilities' as const,
    date: '2025-01-18',
    split_type: 'equal' as const,
    paid_by: 'user-2',
    household_id: 'household-1',
    created_at: '2025-01-18T14:00:00Z',
    updated_at: '2025-01-18T14:00:00Z',
    payer: {
      id: 'user-2',
      full_name: 'Member Two',
      email: 'member2@example.com',
    },
    expense_shares: [
      {
        id: 'share-3',
        expense_id: 'expense-2',
        user_id: 'user-1',
        amount: 44.50,
        paid: false,
      },
      {
        id: 'share-4',
        expense_id: 'expense-2',
        user_id: 'user-2',
        amount: 44.50,
        paid: true,
      },
    ],
  },
]

const mockBalances = [
  {
    user_id: 'user-1',
    full_name: 'Test User',
    balance: 15.75, // owes 44.50 to user-2, paid 60.25 for user-2
  },
  {
    user_id: 'user-2',
    full_name: 'Member Two',
    balance: -15.75,
  },
]

const mockStats = {
  totalExpenses: 209.50,
  yourTotalShare: 104.75,
  pendingExpenses: mockExpenses.filter(e => 
    e.expense_shares.some(s => s.user_id === 'user-1' && !s.paid)
  ),
}

const mockQueryClient = {
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
}

// Mock useBalances hook
jest.mock('@/hooks/use-balance', () => ({
  useBalances: () => ({
    balances: mockBalances,
    yourBalances: mockBalances.filter(b => b.user_id !== 'user-1'),
    yourNetBalance: 15.75,
    loading: false,
    error: null,
    addOptimisticExpense: jest.fn(),
    updateOptimisticExpense: jest.fn(),
    removeOptimisticExpense: jest.fn(),
    settleOptimisticExpense: jest.fn(),
  }),
}))

// Mock useExpenses hook
jest.mock('@/hooks/use-expense', () => ({
  useExpenses: () => ({
    expenses: mockExpenses,
    currentUser: mockCurrentUser,
    loading: false,
    error: null,
    stats: mockStats,
    addExpense: jest.fn(),
    editExpense: jest.fn(),
    deleteExpense: jest.fn(),
    settleExpense: jest.fn(),
  }),
}))

// Mock useHouseholdMembers hook
jest.mock('@/hooks/use-supabase-data', () => ({
  useHouseholdMembers: () => ({
    members: mockHouseholdMembers,
  }),
}))

describe('Expenses Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseQuery.mockImplementation((options: any) => ({
      data: null,
      isLoading: false,
      error: null,
    }))

    mockUseMutation.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
      error: null,
    } as any)

    mockUseQueryClient.mockReturnValue(mockQueryClient as any)
  })

  it('renders the expenses page with correct structure', () => {
    render(<ExpensesPage />)
    
    expect(screen.getByText('Expenses & Payments')).toBeInTheDocument()
    expect(screen.getByText('Track shared expenses and manage payments')).toBeInTheDocument()
  })

  it('displays expense statistics correctly', () => {
    render(<ExpensesPage />)
    
    expect(screen.getByText('$209.50')).toBeInTheDocument() // Total expenses
    expect(screen.getByText('$104.75')).toBeInTheDocument() // Your total share
  })

  it('displays balances sidebar correctly', () => {
    render(<ExpensesPage />)
    
    expect(screen.getByText('Member Two')).toBeInTheDocument()
    expect(screen.getByText('$15.75')).toBeInTheDocument() // Balance amount
  })

  it('displays expense list with correct items', () => {
    render(<ExpensesPage />)
    
    expect(screen.getByText('Grocery Shopping')).toBeInTheDocument()
    expect(screen.getByText('Electricity Bill')).toBeInTheDocument()
    expect(screen.getByText('$120.50')).toBeInTheDocument()
    expect(screen.getByText('$89.00')).toBeInTheDocument()
  })

  it('opens create expense dialog when add button is clicked', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    expect(screen.getByText('Add New Expense')).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
  })

  it('creates a new expense successfully', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    // Fill form
    await user.type(screen.getByLabelText(/description/i), 'New Expense')
    await user.type(screen.getByLabelText(/amount/i), '50.00')
    await user.selectOptions(screen.getByLabelText(/category/i), 'food')
    await user.type(screen.getByLabelText(/date/i), '2025-01-21')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    // Should call addExpense function (mocked)
    await waitFor(() => {
      expect(screen.queryByText('Add New Expense')).not.toBeInTheDocument()
    })
  })

  it('handles custom split expense creation', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    // Fill basic info
    await user.type(screen.getByLabelText(/description/i), 'Custom Split Expense')
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    
    // Select custom split
    const splitTypeSelect = screen.getByLabelText(/split type/i)
    await user.selectOptions(splitTypeSelect, 'custom')
    
    // Should show custom split options
    expect(screen.getByText('Custom Split')).toBeInTheDocument()
    
    // Set custom amounts
    const user1AmountInput = screen.getByLabelText(/test user.*amount/i)
    const user2AmountInput = screen.getByLabelText(/member two.*amount/i)
    
    await user.type(user1AmountInput, '60.00')
    await user.type(user2AmountInput, '40.00')
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
  })

  it('edits an existing expense', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Find and click edit button for an expense
    const editButton = screen.getByRole('button', { name: /edit.*grocery shopping/i })
    await user.click(editButton)
    
    // Should open edit dialog
    expect(screen.getByText('Edit Expense')).toBeInTheDocument()
    
    // Modify expense description
    const descriptionInput = screen.getByDisplayValue('Grocery Shopping')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Weekly Grocery Shopping')
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)
  })

  it('deletes an expense with confirmation', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete.*grocery shopping/i })
    await user.click(deleteButton)
    
    // Should show confirmation dialog
    expect(screen.getByText('Are you sure you want to delete this expense?')).toBeInTheDocument()
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete/i })
    await user.click(confirmButton)
  })

  it('settles an expense', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Find and click settle button for an unpaid expense
    const settleButton = screen.getByRole('button', { name: /settle.*electricity bill/i })
    await user.click(settleButton)
    
    // Should show confirmation dialog
    expect(screen.getByText('Settle Expense')).toBeInTheDocument()
    
    // Confirm settlement
    const confirmButton = screen.getByRole('button', { name: /settle/i })
    await user.click(confirmButton)
  })

  it('handles expense validation errors', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    // Should show validation errors
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
  })

  it('validates custom split amounts equal total', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    // Fill basic info
    await user.type(screen.getByLabelText(/description/i), 'Custom Split Test')
    await user.type(screen.getByLabelText(/amount/i), '100.00')
    
    // Select custom split
    await user.selectOptions(screen.getByLabelText(/split type/i), 'custom')
    
    // Set amounts that don't add up
    const user1AmountInput = screen.getByLabelText(/test user.*amount/i)
    const user2AmountInput = screen.getByLabelText(/member two.*amount/i)
    
    await user.type(user1AmountInput, '30.00')
    await user.type(user2AmountInput, '40.00') // Total = 70, but expense is 100
    
    // Try to submit
    const submitButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(submitButton)
    
    // Should show validation error
    expect(screen.getByText('Custom split amounts must equal the total expense amount')).toBeInTheDocument()
  })

  it('filters expenses correctly', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Find filter controls
    const categoryFilter = screen.getByLabelText(/filter by category/i)
    await user.selectOptions(categoryFilter, 'groceries')
    
    // Should filter to show only grocery expenses
    expect(screen.getByText('Grocery Shopping')).toBeInTheDocument()
    expect(screen.queryByText('Electricity Bill')).not.toBeInTheDocument()
  })

  it('handles loading states correctly', () => {
    // Mock loading state
    jest.doMock('@/hooks/use-expense', () => ({
      useExpenses: () => ({
        expenses: [],
        currentUser: null,
        loading: true,
        error: null,
        stats: { totalExpenses: 0, yourTotalShare: 0, pendingExpenses: [] },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      }),
    }))

    render(<ExpensesPage />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles error states correctly', () => {
    // Mock error state
    jest.doMock('@/hooks/use-expense', () => ({
      useExpenses: () => ({
        expenses: [],
        currentUser: null,
        loading: false,
        error: 'Failed to load expenses',
        stats: { totalExpenses: 0, yourTotalShare: 0, pendingExpenses: [] },
        addExpense: jest.fn(),
        editExpense: jest.fn(),
        deleteExpense: jest.fn(),
        settleExpense: jest.fn(),
      }),
    }))

    render(<ExpensesPage />)
    
    expect(screen.getByText('Failed to load expenses')).toBeInTheDocument()
  })

  it('displays expense details dialog', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Click on expense to view details
    const expenseItem = screen.getByText('Grocery Shopping')
    await user.click(expenseItem)
    
    // Should show details dialog
    expect(screen.getByText('Expense Details')).toBeInTheDocument()
    expect(screen.getByText('$120.50')).toBeInTheDocument()
    expect(screen.getByText('groceries')).toBeInTheDocument()
  })

  it('handles expense category changes', async () => {
    const user = userEvent.setup()
    render(<ExpensesPage />)
    
    // Open create dialog
    const addButton = screen.getByRole('button', { name: /add expense/i })
    await user.click(addButton)
    
    // Test different categories
    const categorySelect = screen.getByLabelText(/category/i)
    
    await user.selectOptions(categorySelect, 'utilities')
    expect(screen.getByDisplayValue('utilities')).toBeInTheDocument()
    
    await user.selectOptions(categorySelect, 'food')
    expect(screen.getByDisplayValue('food')).toBeInTheDocument()
    
    await user.selectOptions(categorySelect, 'transportation')
    expect(screen.getByDisplayValue('transportation')).toBeInTheDocument()
  })
})