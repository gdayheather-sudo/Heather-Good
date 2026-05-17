import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, ONBOARDING_PRODUCT } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { kit_id } = await req.json().catch(() => ({}));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const success = kit_id
    ? `${appUrl}/onboarding/${kit_id}?purchase=success`
    : `${appUrl}/billing?purchase=success`;
  const cancel = kit_id
    ? `${appUrl}/onboarding/${kit_id}`
    : `${appUrl}/billing`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: process.env.STRIPE_PRICE_ONBOARDING!, quantity: 1 }],
    success_url: success,
    cancel_url: cancel,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      user_id: user.id,
      product: ONBOARDING_PRODUCT,
      kit_id: kit_id ?? '',
    },
  });

  return NextResponse.json({ url: session.url });
}
