import { renderHook, act } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { useBalances, calculateBalances } from '@/hooks/use-balance';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('@/hooks/use-profile');
jest.mock('@/hooks/use-household-member');
jest.mock('@/lib/supabase/client');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

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
  { id: 'user-3', full_name: 'User Three', email: 'user3@example.com' },
];

const mockSplitsData = [
  {
    id: 'split-1',
    expense_id: 'expense-1',
    user_id: 'user-1',
    amount_owed: 50,
    is_settled: false,
    expense: {
      id: 'expense-1',
      description: 'Groceries',
      amount: 100,
      paid_by: 'user-1',
      household_id: 'household-1',
    },
  },
  {
    id: 'split-2',
    expense_id: 'expense-1',
    user_id: 'user-2',
    amount_owed: 50,
    is_settled: false,
    expense: {
      id: 'expense-1',
      description: 'Groceries',
      amount: 100,
      paid_by: 'user-1',
      household_id: 'household-1',
    },
  },
  {
    id: 'split-3',
    expense_id: 'expense-2',
    user_id: 'user-1',
    amount_owed: 30,
    is_settled: false,
    expense: {
      id: 'expense-2',
      description: 'Transport',
      amount: 60,
      paid_by: 'user-2',
      household_id: 'household-1',
    },
  },
  {
    id: 'split-4',
    expense_id: 'expense-2',
    user_id: 'user-2',
    amount_owed: 30,
    is_settled: false,
    expense: {
      id: 'expense-2',
      description: 'Transport',
      amount: 60,
      paid_by: 'user-2',
      household_id: 'household-1',
    },
  },
];

describe('useBalances Hook', () => {
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
      data: {
        balances: [],
        yourBalances: [],
        yourNetBalance: 0,
      },
      isLoading: false,
      error: null,
    });
  });

  describe('calculateBalances function', () => {
    it('should calculate balances correctly for simple case', () => {
      const simpleSplits = [
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Groceries',
            amount: 100,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
      ];

      const simpleMembers = [
        { id: 'user-1', full_name: 'User One' },
        { id: 'user-2', full_name: 'User Two' },
      ];

      const result = calculateBalances(simpleSplits, simpleMembers);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fromUser: { id: 'user-2', full_name: 'User Two' },
        toUser: { id: 'user-1', full_name: 'User One' },
        amount: 50,
        related_splits: simpleSplits,
        payment_link: undefined,
      });
    });

    it('should handle settled expenses correctly', () => {
      const settledSplits = [
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-2',
          amount_owed: 50,
          is_settled: true, // This should be ignored
          expense: {
            id: 'expense-1',
            description: 'Groceries',
            amount: 100,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
      ];

      const simpleMembers = [
        { id: 'user-1', full_name: 'User One' },
        { id: 'user-2', full_name: 'User Two' },
      ];

      const result = calculateBalances(settledSplits, simpleMembers);

      expect(result).toHaveLength(0); // No balances for settled expenses
    });

    it('should handle self-payment correctly', () => {
      const selfPaymentSplits = [
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-1',
          amount_owed: 100,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Personal expense',
            amount: 100,
            paid_by: 'user-1', // Same as user_id
            household_id: 'household-1',
          },
        },
      ];

      const simpleMembers = [
        { id: 'user-1', full_name: 'User One' },
        { id: 'user-2', full_name: 'User Two' },
      ];

      const result = calculateBalances(selfPaymentSplits, simpleMembers);

      expect(result).toHaveLength(0); // No balance created for self-payment
    });

    it('should calculate net balances between users correctly', () => {
      const complexSplits = [
        // User 1 paid 100, User 2 owes 50
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Groceries',
            amount: 100,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
        // User 2 paid 60, User 1 owes 30
        {
          id: 'split-2',
          expense_id: 'expense-2',
          user_id: 'user-1',
          amount_owed: 30,
          is_settled: false,
          expense: {
            id: 'expense-2',
            description: 'Transport',
            amount: 60,
            paid_by: 'user-2',
            household_id: 'household-1',
          },
        },
      ];

      const simpleMembers = [
        { id: 'user-1', full_name: 'User One' },
        { id: 'user-2', full_name: 'User Two' },
      ];

      const result = calculateBalances(complexSplits, simpleMembers);

      expect(result).toHaveLength(1);
      // User 2 owes User 1: 50 - 30 = 20
      expect(result[0]).toEqual({
        fromUser: { id: 'user-2', full_name: 'User Two' },
        toUser: { id: 'user-1', full_name: 'User One' },
        amount: 20,
        related_splits: complexSplits,
        payment_link: undefined,
      });
    });

    it('should handle multiple users correctly', () => {
      const multiUserSplits = [
        // User 1 paid 90, split 3 ways
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-2',
          amount_owed: 30,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Dinner',
            amount: 90,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
        {
          id: 'split-2',
          expense_id: 'expense-1',
          user_id: 'user-3',
          amount_owed: 30,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Dinner',
            amount: 90,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
      ];

      const result = calculateBalances(multiUserSplits, mockMembers);

      expect(result).toHaveLength(2);
      
      // User 2 owes User 1: 30
      expect(result.find(b => b.fromUser.id === 'user-2' && b.toUser.id === 'user-1')).toEqual({
        fromUser: { id: 'user-2', full_name: 'User Two', email: 'user2@example.com' },
        toUser: { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
        amount: 30,
        related_splits: [multiUserSplits[0]],
        payment_link: undefined,
      });

      // User 3 owes User 1: 30
      expect(result.find(b => b.fromUser.id === 'user-3' && b.toUser.id === 'user-1')).toEqual({
        fromUser: { id: 'user-3', full_name: 'User Three', email: 'user3@example.com' },
        toUser: { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
        amount: 30,
        related_splits: [multiUserSplits[1]],
        payment_link: undefined,
      });
    });

    it('should handle small amounts correctly', () => {
      const smallAmountSplits = [
        {
          id: 'split-1',
          expense_id: 'expense-1',
          user_id: 'user-2',
          amount_owed: 0.01,
          is_settled: false,
          expense: {
            id: 'expense-1',
            description: 'Small expense',
            amount: 0.01,
            paid_by: 'user-1',
            household_id: 'household-1',
          },
        },
      ];

      const simpleMembers = [
        { id: 'user-1', full_name: 'User One' },
        { id: 'user-2', full_name: 'User Two' },
      ];

      const result = calculateBalances(smallAmountSplits, simpleMembers);

      expect(result).toHaveLength(0); // Amount too small (less than 0.01)
    });
  });

  describe('Hook initialization', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useBalances());

      expect(result.current.balances).toEqual([]);
      expect(result.current.yourBalances).toEqual([]);
      expect(result.current.yourNetBalance).toBe(0);
      expect(result.current.householdMembers).toEqual(mockMembers);
      expect(result.current.currentUser).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.loading).toBe(true);
    });

    it('should handle error state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Balance fetch error'),
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.error).toBe('Balance fetch error');
    });
  });

  describe('Data fetching', () => {
    it('should fetch balances successfully', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockSplitsData,
          error: null,
        }),
      };

      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      const mockBalanceData = {
        balances: [
          {
            fromUser: { id: 'user-2', full_name: 'User Two' },
            toUser: { id: 'user-1', full_name: 'Test User' },
            amount: 20,
            related_splits: mockSplitsData,
            payment_link: undefined,
          },
        ],
        yourBalances: [
          {
            fromUser: { id: 'user-2', full_name: 'User Two' },
            toUser: { id: 'user-1', full_name: 'Test User' },
            amount: 20,
            related_splits: mockSplitsData,
            payment_link: undefined,
          },
        ],
        yourNetBalance: 20,
      };

      mockUseQuery.mockReturnValue({
        data: mockBalanceData,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.balances).toEqual(mockBalanceData.balances);
      expect(result.current.yourBalances).toEqual(mockBalanceData.yourBalances);
      expect(result.current.yourNetBalance).toBe(20);
    });

    it('should handle fetch error', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      (createClient as jest.Mock).mockReturnValue(mockSupabase);

      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch balances: Database error'),
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.error).toBe('Failed to fetch balances: Database error');
    });
  });

  describe('Net balance calculation', () => {
    it('should calculate positive net balance when owed money', () => {
      const mockBalanceData = {
        balances: [],
        yourBalances: [
          {
            fromUser: { id: 'user-2', full_name: 'User Two' },
            toUser: { id: 'user-1', full_name: 'Test User' },
            amount: 50,
            related_splits: [],
            payment_link: undefined,
          },
        ],
        yourNetBalance: 50,
      };

      mockUseQuery.mockReturnValue({
        data: mockBalanceData,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.yourNetBalance).toBe(50); // Positive = owed money
    });

    it('should calculate negative net balance when owing money', () => {
      const mockBalanceData = {
        balances: [],
        yourBalances: [
          {
            fromUser: { id: 'user-1', full_name: 'Test User' },
            toUser: { id: 'user-2', full_name: 'User Two' },
            amount: 30,
            related_splits: [],
            payment_link: undefined,
          },
        ],
        yourNetBalance: -30,
      };

      mockUseQuery.mockReturnValue({
        data: mockBalanceData,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.yourNetBalance).toBe(-30); // Negative = owing money
    });

    it('should calculate zero net balance when even', () => {
      const mockBalanceData = {
        balances: [],
        yourBalances: [
          {
            fromUser: { id: 'user-2', full_name: 'User Two' },
            toUser: { id: 'user-1', full_name: 'Test User' },
            amount: 30,
            related_splits: [],
            payment_link: undefined,
          },
          {
            fromUser: { id: 'user-1', full_name: 'Test User' },
            toUser: { id: 'user-2', full_name: 'User Two' },
            amount: 30,
            related_splits: [],
            payment_link: undefined,
          },
        ],
        yourNetBalance: 0,
      };

      mockUseQuery.mockReturnValue({
        data: mockBalanceData,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.yourNetBalance).toBe(0); // Zero = even
    });
  });

  describe('Error handling', () => {
    it('should handle profile errors', () => {
      const { useProfile } = require('@/hooks/use-profile');
      useProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: new Error('Profile error'),
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.error).toBe('Profile error');
    });

    it('should handle members errors', () => {
      const { useHouseholdMembers } = require('@/hooks/use-household-member');
      useHouseholdMembers.mockReturnValue({
        members: [],
        loading: false,
        error: new Error('Members error'),
      });

      const { result } = renderHook(() => useBalances());

      expect(result.current.error).toBe('Members error');
    });
  });

  describe('Query configuration', () => {
    it('should only run query when household and members are available', () => {
      const { useProfile } = require('@/hooks/use-profile');
      useProfile.mockReturnValue({
        profile: { ...mockProfile, household_id: null },
        loading: false,
        error: null,
      });

      renderHook(() => useBalances());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should run query when household and members are available', () => {
      renderHook(() => useBalances());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });
  });
});
