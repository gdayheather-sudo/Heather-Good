import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ONBOARDING_PRODUCT } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { kit_id } = await req.json();
  if (!kit_id) return NextResponse.json({ error: 'kit_id required' }, { status: 400 });

  // Confirm the kit belongs to this user (RLS-respecting).
  const { data: kit } = await supabase
    .from('kits')
    .select('id, is_unlocked, status')
    .eq('id', kit_id)
    .maybeSingle();
  if (!kit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (kit.is_unlocked) return NextResponse.json({ ok: true, already: true });
  if (kit.status !== 'generated') {
    return NextResponse.json({ error: 'not_ready' }, { status: 400 });
  }

  const service = createServiceClient();

  // Find the oldest purchase with credit left for this product.
  const { data: purchases, error: pErr } = await service
    .from('purchases')
    .select('id, credits_total, credits_used')
    .eq('user_id', user.id)
    .eq('product', ONBOARDING_PRODUCT)
    .order('created_at', { ascending: true });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const target = (purchases ?? []).find(
    (p) => (p.credits_total ?? 0) - (p.credits_used ?? 0) > 0
  );
  if (!target) {
    return NextResponse.json({ error: 'no_credits' }, { status: 402 });
  }

  // Spend the credit then unlock the kit. Two-step (no transaction wrapper in
  // supabase-js); credits_used is the gating side, with an optimistic lock so
  // two concurrent unlocks can't both succeed.
  const { data: spent, error: spendErr } = await service
    .from('purchases')
    .update({ credits_used: (target.credits_used ?? 0) + 1 })
    .eq('id', target.id)
    .eq('credits_used', target.credits_used ?? 0)
    .select('id');

  if (spendErr) return NextResponse.json({ error: spendErr.message }, { status: 500 });
  if (!spent || spent.length === 0) {
    return NextResponse.json({ error: 'race, try again' }, { status: 409 });
  }

  const { error: unlockErr } = await service
    .from('kits')
    .update({ is_unlocked: true })
    .eq('id', kit_id);

  if (unlockErr) {
    // Refund the credit if the unlock failed.
    await service
      .from('purchases')
      .update({ credits_used: target.credits_used ?? 0 })
      .eq('id', target.id);
    return NextResponse.json({ error: unlockErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
