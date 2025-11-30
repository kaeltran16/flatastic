import { getNextUserInRotation } from '@/lib/actions/chore-webhooks';
import { createClient } from '@/lib/supabase/server';
import { createSystemClient } from '@/lib/supabase/system';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/system', () => ({
  createSystemClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Chore Scheduling', () => {
  let mockSupabase: any;

  const mockHouseholdId = 'household-123';
  const mockTemplateId = 'template-123';

  const mockUsers = [
    { id: 'user-1', full_name: 'User 1', is_available: true },
    { id: 'user-2', full_name: 'User 2', is_available: true },
    { id: 'user-3', full_name: 'User 3', is_available: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createSystemClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should follow custom rotation order', async () => {
    const customOrder = ['user-2', 'user-3', 'user-1'];

    // Mock household fetch with custom order
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { chore_rotation_order: customOrder }, 
            error: null 
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockUsers, 
            error: null 
          }),
        };
      }
      if (table === 'template_assignment_tracker') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { last_assigned_user_id: 'user-2' }, 
            error: null 
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
        };
      }
      return mockSupabase;
    });

    const result = await getNextUserInRotation(mockHouseholdId, mockTemplateId);

    // Last assigned was user-2.
    // Order is [user-2, user-3, user-1].
    // Next should be user-3.
    expect(result).toBe('user-3');
  });

  it('should skip unavailable users in custom rotation', async () => {
    const customOrder = ['user-2', 'user-3', 'user-1'];
    const usersWithUnavailable = [
      { id: 'user-1', full_name: 'User 1', is_available: true },
      { id: 'user-2', full_name: 'User 2', is_available: true },
      { id: 'user-3', full_name: 'User 3', is_available: false }, // user-3 is unavailable
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { chore_rotation_order: customOrder }, 
            error: null 
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: usersWithUnavailable.filter(u => u.is_available), 
            error: null 
          }),
        };
      }
      if (table === 'template_assignment_tracker') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { last_assigned_user_id: 'user-2' }, 
            error: null 
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
        };
      }
      return mockSupabase;
    });

    const result = await getNextUserInRotation(mockHouseholdId, mockTemplateId);

    // Last assigned was user-2.
    // Order is [user-2, user-3, user-1].
    // Next should be user-3, but they are unavailable.
    // Only user-1 and user-2 are available.
    // After user-2 comes user-1 (since user-3 is filtered out by is_available=true query).
    expect(result).toBe('user-1');
  });

  it('should fall back to default order if no custom order', async () => {
    // Mock household fetch with NO custom order
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { chore_rotation_order: null }, 
            error: null 
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockUsers, 
            error: null 
          }),
        };
      }
      if (table === 'template_assignment_tracker') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { last_assigned_user_id: 'user-1' }, 
            error: null 
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
        };
      }
      return mockSupabase;
    });

    const result = await getNextUserInRotation(mockHouseholdId, mockTemplateId);

    // Last assigned was user-1.
    // Users are [user-1, user-2, user-3] (default DB order).
    // Next should be user-2.
    expect(result).toBe('user-2');
  });

  it('should handle case where last assigned user is not in rotation', async () => {
    const customOrder = ['user-2', 'user-3', 'user-1'];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'households') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { chore_rotation_order: customOrder }, 
            error: null 
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: mockUsers, 
            error: null 
          }),
        };
      }
      if (table === 'template_assignment_tracker') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { last_assigned_user_id: 'unknown-user' }, 
            error: null 
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnThis(),
        };
      }
      return mockSupabase;
    });

    const result = await getNextUserInRotation(mockHouseholdId, mockTemplateId);

    // Last assigned user is unknown.
    // Should start from beginning of order: user-2.
    expect(result).toBe('user-2');
  });
});

