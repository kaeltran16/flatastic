/**
 * @jest-environment node
 */
import { isValidWebhookSecret } from '@/lib/utils/webhook-auth';

function requestWithSecret(secret?: string) {
  const headers = new Headers();
  if (secret !== undefined) headers.set('x-webhook-secret', secret);
  return new Request('https://example.com/api/webhooks/test', { headers });
}

describe('isValidWebhookSecret', () => {
  const originalSecret = process.env.SUPABASE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = 'correct-secret';
  });

  afterAll(() => {
    process.env.SUPABASE_WEBHOOK_SECRET = originalSecret;
  });

  it('accepts the configured secret', () => {
    expect(isValidWebhookSecret(requestWithSecret('correct-secret'))).toBe(true);
  });

  it.each([
    ['a wrong secret of the same length', 'correct-secreX'],
    ['a wrong secret of a different length', 'x'],
    ['an empty header', ''],
    ['a missing header', undefined],
  ])('rejects %s', (_label, secret) => {
    expect(isValidWebhookSecret(requestWithSecret(secret))).toBe(false);
  });

  it('rejects everything when no secret is configured', () => {
    delete process.env.SUPABASE_WEBHOOK_SECRET;
    expect(isValidWebhookSecret(requestWithSecret(''))).toBe(false);
    expect(isValidWebhookSecret(requestWithSecret('anything'))).toBe(false);
  });
});
