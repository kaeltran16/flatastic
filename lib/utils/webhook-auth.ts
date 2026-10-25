import crypto from 'crypto';

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest();

export function isValidWebhookSecret(request: Request): boolean {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET;
  const provided = request.headers.get('x-webhook-secret');

  if (!expected || !provided) return false;

  // hash first so timingSafeEqual gets equal-length buffers instead of throwing
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}
