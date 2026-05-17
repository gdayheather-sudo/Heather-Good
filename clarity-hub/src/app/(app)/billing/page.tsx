import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: purchases } = await supabase
    .from('purchases')
    .select('product, credits_total, credits_used, amount_cents, created_at')
    .order('created_at', { ascending: false });

  const summary = (purchases ?? []).reduce<Record<string, { total: number; used: number }>>(
    (acc, p) => {
      const k = p.product;
      acc[k] = acc[k] || { total: 0, used: 0 };
      acc[k].total += p.credits_total;
      acc[k].used += p.credits_used;
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-2xl">
      <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">Billing</p>
      <h1 className="serif text-3xl text-navy mb-6">Credits & purchases</h1>

      <section className="mb-10">
        <h2 className="serif text-xl text-navy mb-3">Credits by tool</h2>
        {Object.keys(summary).length === 0 ? (
          <p className="text-charcoal/60">No purchases yet.</p>
        ) : (
          <ul className="divide-y divide-navy/10 border border-navy/10 rounded-lg bg-white/60">
            {Object.entries(summary).map(([product, s]) => (
              <li key={product} className="px-4 py-3 flex justify-between">
                <span className="text-charcoal">{labelFor(product)}</span>
                <span className="text-charcoal/70 text-sm">
                  {s.total - s.used} of {s.total} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="serif text-xl text-navy mb-3">History</h2>
        {purchases && purchases.length > 0 ? (
          <ul className="divide-y divide-navy/10 border border-navy/10 rounded-lg bg-white/60">
            {purchases.map((p, i) => (
              <li key={i} className="px-4 py-3 flex justify-between text-sm">
                <span>{labelFor(p.product)}</span>
                <span className="text-charcoal/70">
                  ${(p.amount_cents ?? 0) / 100} ·{' '}
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-charcoal/60">Nothing here yet.</p>
        )}
      </section>
    </div>
  );
}

function labelFor(product: string) {
  if (product === 'onboarding_builder') return 'Onboarding Builder (3 kits)';
  if (product === 'pass') return 'Clarity Hub Pass';
  return product;
}
