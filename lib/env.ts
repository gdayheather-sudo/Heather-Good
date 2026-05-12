// Runtime-checked environment variables. Import from here, not process.env,
// so missing keys fail loudly at boot rather than as cryptic runtime errors.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};

// Server-only — never import these from client components.
export const serverEnv = {
  supabaseServiceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: optionalEnv('OPENAI_API_KEY'),
  anthropicApiKey: optionalEnv('ANTHROPIC_API_KEY'),
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  stripeSecretKey: optionalEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceId: optionalEnv('STRIPE_PRICE_ID'),
};
