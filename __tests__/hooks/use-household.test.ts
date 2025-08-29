import { useHousehold } from '@/hooks/use-household';
import { useHouseholdMembers } from '@/hooks/use-household-member';
import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';

// Mock the hooks
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Mock data
const mockHousehold = {
  id: '1',
  name: 'Test Household',
  description: 'A test household',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMembers = [
  {
    id: 'user1',
    email: 'test@example.com',
    full_name: 'Test User',
    household_id: '1',
    created_at: '2024-01-01T00:00:00Z',
  },
];

describe('useHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useHousehold', () => {
    it('should fetch household data successfully', async () => {
      mockUseQuery.mockReturnValue({
        data: mockHousehold,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHousehold('1'));

      expect(result.current.household).toEqual(mockHousehold);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.exists).toBe(true);
    });

    it('should handle loading state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHousehold('1'));

      expect(result.current.household).toBeUndefined();
      expect(result.current.loading).toBe(true);
      expect(result.current.exists).toBe(false);
    });

    it('should handle error state', () => {
      const mockError = new Error('Failed to fetch household');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        isError: true,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHousehold('1'));

      expect(result.current.household).toBeUndefined();
      expect(result.current.error).toBe(mockError);
      expect(result.current.exists).toBe(false);
    });

    it('should handle not found error', () => {
      const mockError = new Error('Household not found');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        isError: true,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHousehold('1'));

      expect(result.current.notFound).toBe(true);
      expect(result.current.exists).toBe(false);
    });

    it('should be disabled when no household ID provided', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      renderHook(() => useHousehold(null));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });
});

describe('useHouseholdMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useHouseholdMembers', () => {
    it('should fetch household members successfully', async () => {
      mockUseQuery.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      expect(result.current.members).toEqual(mockMembers);
      expect(result.current.loading).toBe(false);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should handle empty members list', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      expect(result.current.members).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should handle loading state', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      expect(result.current.members).toEqual([]);
      expect(result.current.loading).toBe(true);
    });

    it('should handle error state', () => {
      const mockError = new Error('Failed to load members');
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        isError: true,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      expect(result.current.members).toEqual([]);
      expect(result.current.error).toBe(mockError);
    });

    it('should be disabled when no household ID provided', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: false,
        refetch: jest.fn(),
        isRefetching: false,
        isStale: false,
      } as any);

      renderHook(() => useHouseholdMembers(null));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should provide refetch functionality', () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: mockRefetch,
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      result.current.refetch();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should provide invalidate functionality', () => {
      const mockRefetch = jest.fn();
      mockUseQuery.mockReturnValue({
        data: mockMembers,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        refetch: mockRefetch,
        isRefetching: false,
        isStale: false,
      } as any);

      const { result } = renderHook(() => useHouseholdMembers('1'));

      result.current.invalidate();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
