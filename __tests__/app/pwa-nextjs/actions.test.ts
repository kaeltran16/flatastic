jest.mock('web-push', () => ({
  __esModule: true,
  default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() },
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));
jest.mock('@/lib/supabase/server');

import { subscribeUser } from '@/app/pwa-nextjs/actions';
import { createClient } from '@/lib/supabase/server';

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

const validSub = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
} as any;

function buildSupabaseMock(opts: {
  user: { id: string } | null;
  upsert?: jest.Mock;
}) {
  const upsert =
    opts.upsert ??
    jest.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'sub-1' }, error: null }),
      }),
    });
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.user ? null : { message: 'no session' },
      }),
    },
    from: jest.fn().mockReturnValue({ upsert }),
    __upsert: upsert,
  } as any;
}

describe('subscribeUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects when unauthenticated', async () => {
    mockedCreateClient.mockResolvedValue(buildSupabaseMock({ user: null }));
    const result = await subscribeUser(validSub, 'UA');
    expect(result).toEqual({ success: false, error: 'unauthenticated' });
  });

  it('uses the authenticated user id, not any client-supplied value', async () => {
    const supabase = buildSupabaseMock({ user: { id: 'real-user' } });
    mockedCreateClient.mockResolvedValue(supabase);

    await subscribeUser(validSub, 'UA');

    expect(supabase.__upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'real-user', endpoint: validSub.endpoint }),
      expect.objectContaining({ onConflict: 'endpoint' })
    );
  });

  it('rejects malformed subscription payloads', async () => {
    mockedCreateClient.mockResolvedValue(buildSupabaseMock({ user: { id: 'real-user' } }));
    const bad = { endpoint: 'not-a-url', keys: { p256dh: '', auth: '' } } as any;
    const result = await subscribeUser(bad, 'UA');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid|validation/i);
  });
});
