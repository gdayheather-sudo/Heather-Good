import 'server-only';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { env, serverEnv } from '@/lib/env';

// Service-role client. Bypasses RLS. Use only in trusted server code
// (route handlers, server actions, background jobs) for writes the user
// shouldn't be able to perform directly — e.g. incrementing trial counters,
// writing to sop_generations, minting share tokens.
export function createServiceClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createSupabase(env.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
