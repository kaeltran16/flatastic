import { createClient } from '@supabase/supabase-js';
import { Database } from './schema.types';

export async function createSystemClient() {
  // create a client with service role (bypass all rls). Make sure it is only created when necessary and not expose to the client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL environment variable');
  }

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase Service Key environment variable');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Helper to check if we're in a webhook context
export function isWebhookContext(): boolean {
  // Check for webhook-specific environment variables or headers
  return (
    process.env.VERCEL_ENV === 'development' && // Running on Vercel
    process.env.NEXT_RUNTIME !== 'nodejs'
  );
}
