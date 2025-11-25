import {
    createChoreTemplate,
    deleteChoreTemplate,
    getChoreTemplates,
    getNextAssignedUser,
    updateChoreTemplate
} from '@/lib/actions/chore-template';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Chore Template Actions', () => {
  let mockSupabase: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockProfile = {
    id: 'user-123',
    household_id: 'household-123',
  };

  const mockTemplate = {
    id: 'template-123',
    name: 'Test Chore',
    description: 'Test Description',
    household_id: 'household-123',
    created_by: 'user-123',
    is_active: true,
    is_custom: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('createChoreTemplate', () => {
    it('should create a chore template successfully', async () => {
      // Mock profile fetch
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profile
        .mockResolvedValueOnce({ data: mockTemplate, error: null }); // insert result

      const input = {
        name: 'Test Chore',
        description: 'Test Description',
      };

      const result = await createChoreTemplate(input);

      expect(result).toEqual(mockTemplate);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('chore_templates');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test Chore',
        created_by: mockUser.id,
        household_id: mockProfile.household_id,
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/chores');
    });

    it('should throw error if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'Error' });

      await expect(createChoreTemplate({ name: 'Test' }))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('updateChoreTemplate', () => {
    it('should update a chore template successfully', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      
      mockSupabase.single.mockResolvedValue({ data: updatedTemplate, error: null });

      const input = {
        id: 'template-123',
        name: 'Updated Name',
      };

      const result = await updateChoreTemplate(input);

      expect(result).toEqual(updatedTemplate);
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/chores');
    });
  });

  describe('deleteChoreTemplate', () => {
    it('should soft delete a chore template', async () => {
      mockSupabase.update.mockReturnThis(); // for update call
      
      // The delete function doesn't return data, just checks for error
      mockSupabase.eq.mockReturnThis();

      await deleteChoreTemplate('template-123');

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        is_active: false,
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/chores');
    });
  });

  describe('getChoreTemplates', () => {
    it('should fetch chore templates', async () => {
      const templates = [mockTemplate];
      
      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null }); // profile
      
      // For the list query, we don't call single(), we await the chain directly or call something else?
      // Looking at the code: .select('*')... then await.
      // So we need to mock the promise resolution of the chain.
      // In the mock setup:
      // mockSupabase.from('chore_templates').select... returns a promise-like object
      
      // Let's adjust the mock for this case
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve({ data: templates, error: null }).then(callback);
        }),
      };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
            }
        }
        return queryBuilder;
      });

      const result = await getChoreTemplates();

      expect(result).toEqual(templates);
    });
  });

  describe('getNextAssignedUser', () => {
    it('should return next user in rotation', async () => {
      const availableUsers = [
        { id: 'user-1', full_name: 'User 1', is_available: true },
        { id: 'user-2', full_name: 'User 2', is_available: true },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockProfile, error: null }) // profile
        .mockResolvedValueOnce({ data: mockTemplate, error: null }) // template
        .mockResolvedValueOnce({ data: { last_assigned_user_id: 'user-1' }, error: null }); // tracker

      // Mock available users list
      const usersQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: availableUsers, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
            // First call is for profile (single), second is for available users (list)
            // This is tricky with the same mock.
            // Let's rely on the fact that profile fetch uses .single() and users fetch uses .order()
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                order: jest.fn().mockResolvedValue({ data: availableUsers, error: null })
            }
        }
        if (table === 'chore_templates') {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: mockTemplate, error: null })
            }
        }
        if (table === 'template_assignment_tracker') {
             return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: { last_assigned_user_id: 'user-1' }, error: null })
            }
        }
        return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const result = await getNextAssignedUser('template-123');

      expect(result).toEqual({ userId: 'user-2', userName: 'User 2' });
    });
  });
});
