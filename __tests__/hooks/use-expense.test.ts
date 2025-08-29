import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useExpenses, fetchExpenses, type ExpenseFormData } from '@/hooks/use-expense';
import { addExpenseAction, editExpenseAction, deleteExpenseAction, settleExpenseAction } from '@/lib/actions/expense';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('sonner');
jest.mock('@/lib/actions/expense');
jest.mock('@/hooks/use-profile');
jest.mock('@/hooks/use-household-member');
jest.mock('@/lib/supabase/client');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock data
const mockProfile = {
  id: 'user-1',
  household_id: 'household-1',
  email: 'test@example.com',
  full_name: 'Test User',
};

const mockMembers = [
  { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
  { id: 'user-2', full_name: 'User Two', email: 'user2@example.com' },
];

const mockExpenses = [
  {
    id: 'expense-1',
    description: 'Groceries',
    amount: 100,
    category: 'Food',
    date: '2024-01-01',
    paid_by: 'user-1',
    household_id: 'household-1',
    expense_splits: [
      { user_id: 'user-1', amount_owed: 50, is_settled: false },
      { user_id: 'user-2', amount_owed: 50, is_settled: false },
    ],
  },
];

const mockQueryClient = {
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
};

describe('useExpenses Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useProfile
    const { useProfile } = require('@/hooks/use-profile');
    useProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
    });

    // Mock useHouseholdMembers
    const { useHouseholdMembers } = require('@/hooks/use-household-member');
    useHouseholdMembers.mockReturnValue({
      members: mockMembers,
      loading: false,
      error: null,
    });

    // Mock useQuery
    mockUseQuery.mockReturnValue({
      data: mockExpenses,
      isLoading: false,
      error: null,
    });

    // Mock useQueryClient
    mockUseQueryClient.mockReturnValue(mockQueryClient);
  });

  describe('fetchExpenses function', () => {
    it('should fetch and process expenses correctly', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      };

      const { createClient } = require('@/lib/supabase/client');
      createClient.mockReturnValue(mockSupabase);

      const result = await fetchExpenses('household-1', 'user-1', mockMembers);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('payer');
      expect(result[0]).toHaveProperty('your_share');
      expect(result[0]).toHaveProperty('status');
    });

    it('should throw error when fetch fails', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      const { createClient } = require('@/lib/supabase/client');
      createClient.mockReturnValue(mockSupabase);

      await expect(fetchExpenses('household-1', 'user-1', mockMembers))
        .rejects.toThrow('Failed to fetch expenses: Database error');
    });
  });

  describe('Hook initialization', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useExpenses());

      expect(result.current.expenses).toEqual(mockExpenses);
      expect(result.current.householdMembers).toEqual(mockMembers);
      expect(result.current.currentUser).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isAddingExpense).toBe(false);
      expect(result.current.isEditingExpense).toBe(false);
      expect(result.current.isDeletingExpense).toBe(false);
      expect(result.current.isSettlingExpense).toBe(false);
    });

    it('should calculate stats correctly', () => {
      const { result } = renderHook(() => useExpenses());

      expect(result.current.stats.totalExpenses).toBe(100);
      expect(result.current.stats.yourTotalShare).toBe(50);
      expect(result.current.stats.pendingExpenses).toHaveLength(1);
    });
  });

  describe('addExpense', () => {
    const mockExpenseData: ExpenseFormData = {
      description: 'New Expense',
      amount: 75,
      category: 'Transport',
      date: '2024-01-02',
      split_type: 'equal',
      selected_users: ['user-1', 'user-2'],
    };

    it('should add expense successfully', async () => {
      (addExpenseAction as jest.Mock).mockResolvedValue({ success: true });
      mockQueryClient.invalidateQueries.mockResolvedValue(undefined);

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await result.current.addExpense(mockExpenseData);
      });

      expect(addExpenseAction).toHaveBeenCalledWith(mockExpenseData);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Expense added successfully');
    });

    it('should handle add expense error', async () => {
      const errorMessage = 'Failed to add expense';
      (addExpenseAction as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.addExpense(mockExpenseData))
          .rejects.toThrow(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should throw error when no household found', async () => {
      const { useProfile } = require('@/hooks/use-profile');
      useProfile.mockReturnValue({
        profile: { ...mockProfile, household_id: null },
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.addExpense(mockExpenseData))
          .rejects.toThrow('No household found');
      });
    });
  });

  describe('editExpense', () => {
    const mockExpenseData: ExpenseFormData = {
      description: 'Updated Expense',
      amount: 80,
      category: 'Food',
      date: '2024-01-01',
      split_type: 'equal',
      selected_users: ['user-1', 'user-2'],
    };

    it('should edit expense successfully', async () => {
      (editExpenseAction as jest.Mock).mockResolvedValue({ success: true });
      mockQueryClient.invalidateQueries.mockResolvedValue(undefined);

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await result.current.editExpense('expense-1', mockExpenseData);
      });

      expect(editExpenseAction).toHaveBeenCalledWith('expense-1', mockExpenseData);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Expense updated successfully');
    });

    it('should handle edit expense error', async () => {
      const errorMessage = 'Failed to edit expense';
      (editExpenseAction as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.editExpense('expense-1', mockExpenseData))
          .rejects.toThrow(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense successfully', async () => {
      (deleteExpenseAction as jest.Mock).mockResolvedValue({ success: true });
      mockQueryClient.invalidateQueries.mockResolvedValue(undefined);

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await result.current.deleteExpense('expense-1');
      });

      expect(deleteExpenseAction).toHaveBeenCalledWith('expense-1');
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Expense deleted successfully');
    });

    it('should handle delete expense error', async () => {
      const errorMessage = 'Failed to delete expense';
      (deleteExpenseAction as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.deleteExpense('expense-1'))
          .rejects.toThrow(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('settleExpense', () => {
    const mockExpense = {
      id: 'expense-1',
      description: 'Groceries',
      amount: 100,
      status: 'pending' as const,
    };

    it('should settle expense successfully', async () => {
      (settleExpenseAction as jest.Mock).mockResolvedValue({ success: true });
      mockQueryClient.invalidateQueries.mockResolvedValue(undefined);

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await result.current.settleExpense(mockExpense);
      });

      expect(settleExpenseAction).toHaveBeenCalledWith('expense-1');
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Expense settled successfully');
    });

    it('should handle settle expense error', async () => {
      const errorMessage = 'Failed to settle expense';
      (settleExpenseAction as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: errorMessage 
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.settleExpense(mockExpense))
          .rejects.toThrow(errorMessage);
      });

      expect(mockToast.error).toHaveBeenCalledWith(errorMessage);
    });

    it('should throw error when no current user', async () => {
      const { useProfile } = require('@/hooks/use-profile');
      useProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useExpenses());

      await act(async () => {
        await expect(result.current.settleExpense(mockExpense))
          .rejects.toThrow('No current user');
      });
    });
  });

  describe('Loading states', () => {
    it('should handle loading states correctly', async () => {
      const { result } = renderHook(() => useExpenses());

      // Test add expense loading
      act(() => {
        result.current.addExpense = jest.fn().mockImplementation(async () => {
          expect(result.current.isAddingExpense).toBe(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      });

      await act(async () => {
        await result.current.addExpense({} as ExpenseFormData);
      });

      expect(result.current.isAddingExpense).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle query errors', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Query error'),
      });

      const { result } = renderHook(() => useExpenses());

      expect(result.current.error).toBe('Query error');
    });

    it('should handle profile errors', () => {
      const { useProfile } = require('@/hooks/use-profile');
      useProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: new Error('Profile error'),
      });

      const { result } = renderHook(() => useExpenses());

      expect(result.current.error).toBe('Profile error');
    });
  });
});
