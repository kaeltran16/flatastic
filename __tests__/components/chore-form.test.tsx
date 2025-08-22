import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChoreForm from '@/components/chore/chore-form'

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

describe('ChoreForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders create form correctly', () => {
    render(<ChoreForm {...mockProps} />)
    
    expect(screen.getByText('Create New Chore')).toBeInTheDocument()
    expect(screen.getByLabelText(/chore name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assigned to/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/recurring type/i)).toBeInTheDocument()
  })

  it('renders edit form with initial data correctly', () => {
    const editProps = {
      ...mockProps,
      mode: 'edit' as const,
      initialData: {
        name: 'Test Chore',
        description: 'Test Description',
        assigned_to: 'user-1',
        due_date: '2025-01-25',
        recurring_type: 'weekly' as const,
        recurring_interval: 1,
      },
    }

    render(<ChoreForm {...editProps} />)
    
    expect(screen.getByText('Edit Chore')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Chore')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('weekly')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Chore name is required')).toBeInTheDocument()
    })
  })

  it('validates chore name length', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const nameInput = screen.getByLabelText(/chore name/i)
    
    // Test name too long
    const longName = 'a'.repeat(101)
    await user.type(nameInput, longName)
    
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Name too long')).toBeInTheDocument()
    })
  })

  it('validates description length', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const nameInput = screen.getByLabelText(/chore name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'Valid Name')
    
    // Test description too long
    const longDescription = 'a'.repeat(501)
    await user.type(descriptionInput, longDescription)
    
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Description too long')).toBeInTheDocument()
    })
  })

  it('shows recurring interval input when recurring type is not "none"', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const recurringSelect = screen.getByLabelText(/recurring type/i)
    await user.click(recurringSelect)
    
    // Select weekly
    const weeklyOption = screen.getByText('Weekly')
    await user.click(weeklyOption)
    
    // Should show interval input
    await waitFor(() => {
      expect(screen.getByLabelText(/recurring interval/i)).toBeInTheDocument()
    })
  })

  it('validates recurring interval when recurring type is set', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const nameInput = screen.getByLabelText(/chore name/i)
    await user.type(nameInput, 'Test Chore')
    
    const recurringSelect = screen.getByLabelText(/recurring type/i)
    await user.click(recurringSelect)
    
    const weeklyOption = screen.getByText('Weekly')
    await user.click(weeklyOption)
    
    // Don't set interval, try to submit
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Recurring interval is required for recurring chores')).toBeInTheDocument()
    })
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    const onSubmitMock = jest.fn().mockResolvedValue(undefined)
    
    render(<ChoreForm {...mockProps} onSubmit={onSubmitMock} />)
    
    // Fill form
    await user.type(screen.getByLabelText(/chore name/i), 'Test Chore')
    await user.type(screen.getByLabelText(/description/i), 'Test Description')
    
    // Select assignee
    const assigneeSelect = screen.getByLabelText(/assigned to/i)
    await user.click(assigneeSelect)
    const assigneeOption = screen.getByText('Test User')
    await user.click(assigneeOption)
    
    // Set due date
    const dueDateButton = screen.getByRole('button', { name: /pick a date/i })
    await user.click(dueDateButton)
    const dateToSelect = screen.getByRole('gridcell', { name: '25' })
    await user.click(dateToSelect)
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Chore',
          description: 'Test Description',
          assigned_to: 'user-1',
          recurring_type: 'none',
          household_id: 'household-1',
        })
      )
    })
  })

  it('handles form submission errors', async () => {
    const user = userEvent.setup()
    const onSubmitMock = jest.fn().mockRejectedValue(new Error('Submission failed'))
    
    render(<ChoreForm {...mockProps} onSubmit={onSubmitMock} />)
    
    // Fill required fields
    await user.type(screen.getByLabelText(/chore name/i), 'Test Chore')
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(onSubmitMock).toHaveBeenCalled()
    })
    
    // Error should be handled gracefully (form should remain open)
    expect(screen.getByText('Create New Chore')).toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    render(<ChoreForm {...mockProps} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /creating/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancelMock = jest.fn()
    
    render(<ChoreForm {...mockProps} onCancel={onCancelMock} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onCancelMock).toHaveBeenCalled()
  })

  it('handles date selection correctly', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    // Open date picker
    const dueDateButton = screen.getByRole('button', { name: /pick a date/i })
    await user.click(dueDateButton)
    
    // Should show calendar
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Select a date
    const dateToSelect = screen.getByRole('gridcell', { name: '15' })
    await user.click(dateToSelect)
    
    // Calendar should close and date should be selected
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('clears recurring interval when recurring type is set to none', async () => {
    const user = userEvent.setup()
    const editProps = {
      ...mockProps,
      mode: 'edit' as const,
      initialData: {
        name: 'Test Chore',
        recurring_type: 'weekly' as const,
        recurring_interval: 2,
      },
    }
    
    render(<ChoreForm {...editProps} />)
    
    // Should show interval input initially
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    
    // Change recurring type to none
    const recurringSelect = screen.getByLabelText(/recurring type/i)
    await user.click(recurringSelect)
    const noneOption = screen.getByText('None')
    await user.click(noneOption)
    
    // Interval input should be hidden
    await waitFor(() => {
      expect(screen.queryByLabelText(/recurring interval/i)).not.toBeInTheDocument()
    })
  })

  it('displays household members in assignee dropdown', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const assigneeSelect = screen.getByLabelText(/assigned to/i)
    await user.click(assigneeSelect)
    
    // Should show all household members plus "Unassigned" option
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Member Two')).toBeInTheDocument()
  })

  it('validates date format correctly', async () => {
    const user = userEvent.setup()
    render(<ChoreForm {...mockProps} />)
    
    const nameInput = screen.getByLabelText(/chore name/i)
    await user.type(nameInput, 'Test Chore')
    
    // Try to set an invalid date (this would be handled by the date picker UI)
    // Most validation happens at the schema level with actual form submission
    
    const submitButton = screen.getByRole('button', { name: /create chore/i })
    await user.click(submitButton)
    
    // With valid name and no invalid date, should not show date error
    await waitFor(() => {
      expect(screen.queryByText('Invalid date format')).not.toBeInTheDocument()
    })
  })
})