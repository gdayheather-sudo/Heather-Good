import type { SupabaseClient } from '@supabase/supabase-js';

export type ProductKey = 'onboarding_builder' | 'pass';

/**
 * Available credits for a given product. A future "Clarity Hub Pass" would be
 * handled here by treating an active `product = 'pass'` row as unlimited.
 */
export async function availableCredits(
  supabase: SupabaseClient,
  userId: string,
  product: ProductKey
): Promise<number> {
  const { data, error } = await supabase
    .from('purchases')
    .select('credits_total, credits_used, product')
    .eq('user_id', userId)
    .eq('product', product);

  if (error) throw error;
  if (!data) return 0;

  return data.reduce(
    (sum, p) => sum + Math.max(0, (p.credits_total ?? 0) - (p.credits_used ?? 0)),
    0
  );
}
