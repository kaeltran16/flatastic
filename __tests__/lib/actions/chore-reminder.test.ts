import { sendChoreReminder } from '@/lib/actions/chore';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('sendChoreReminder', () => {
  const sender = { id: 'user-1' };
  const senderProfile = { household_id: 'household-1', full_name: 'Alice Smith' };
  const baseChore = {
    household_id: 'household-1',
    status: 'pending',
    name: 'Take out trash',
    due_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    assigned_to: 'user-2',
  };

  let mockSupabase: any;

  function setup(chore: Record<string, unknown> | null, rpcError: unknown = null) {
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: sender }, error: null }),
      },
      from: jest.fn((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          table === 'profiles'
            ? { data: senderProfile, error: null }
            : chore
              ? { data: chore, error: null }
              : { data: null, error: { message: 'not found' } }
        ),
      })),
      rpc: jest.fn().mockResolvedValue({ data: 'notif-1', error: rpcError }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends a push notification to the assignee naming the sender', async () => {
    setup(baseChore);

    const result = await sendChoreReminder('chore-1');

    expect(result).toEqual({ success: true });
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_notification_with_push',
      expect.objectContaining({
        p_user_id: 'user-2',
        p_household_id: 'household-1',
        p_type: 'chore_nudge',
      })
    );
    const { p_message } = mockSupabase.rpc.mock.calls[0][1];
    expect(p_message).toContain('Alice');
    expect(p_message).toContain('"Take out trash"');
    expect(p_message).toContain('due in');
  });

  it('omits the due part when the chore has no due date', async () => {
    setup({ ...baseChore, due_date: null });

    await sendChoreReminder('chore-1');

    const { p_message } = mockSupabase.rpc.mock.calls[0][1];
    expect(p_message).not.toContain('due');
  });

  it.each([
    ['chore is missing', null, 'NOT_FOUND'],
    ['chore belongs to another household', { ...baseChore, household_id: 'household-2' }, 'UNAUTHORIZED'],
    ['chore is completed', { ...baseChore, status: 'completed' }, 'ALREADY_COMPLETED'],
    ['chore is unassigned', { ...baseChore, assigned_to: null }, 'NO_ASSIGNEE'],
    ['chore is assigned to the sender', { ...baseChore, assigned_to: 'user-1' }, 'SELF_REMINDER'],
  ])('rejects when the %s', async (_label, chore, code) => {
    setup(chore);

    const result = await sendChoreReminder('chore-1');

    expect(result).toMatchObject({ success: false, code });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('reports a failure when the notification RPC errors', async () => {
    setup(baseChore, { message: 'push failed' });

    const result = await sendChoreReminder('chore-1');

    expect(result).toMatchObject({ success: false, code: 'NOTIFICATION_ERROR' });
  });
});
