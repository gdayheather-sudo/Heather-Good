import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client for use in API routes / server components ONLY.
// It bypasses RLS, so every query must be explicitly scoped (e.g. by token).
// NEVER import this into client components.

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const AUDIO_BUCKET =
  process.env.SUPABASE_AUDIO_BUCKET || "intake-audio";
