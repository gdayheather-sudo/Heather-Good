import { NextResponse } from 'next/server';
import { stripe, ONBOARDING_PRODUCT, ONBOARDING_CREDITS_PER_PURCHASE } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.user_id;
    const product = (session.metadata?.product as string) || ONBOARDING_PRODUCT;

    if (!userId) {
      return NextResponse.json({ error: 'no_user' }, { status: 400 });
    }

    const service = createServiceClient();
    await service.from('purchases').upsert(
      {
        user_id: userId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        product,
        credits_total: ONBOARDING_CREDITS_PER_PURCHASE,
        credits_used: 0,
        amount_cents: session.amount_total ?? null,
      },
      { onConflict: 'stripe_checkout_session_id' }
    );
  }

  return NextResponse.json({ received: true });
}
