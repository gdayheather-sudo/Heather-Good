import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { availableCredits } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: kits }, credits] = await Promise.all([
    supabase
      .from('kits')
      .select('id, name, status, is_unlocked, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5),
    availableCredits(supabase, user.id, 'onboarding_builder'),
  ]);

  const kitCount = kits?.length ?? 0;

  return (
    <div className="space-y-12">
      <section>
        <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">Home</p>
        <h1 className="serif text-4xl text-navy">
          Welcome back{user.email ? `, ${user.email.split('@')[0]}` : ''}.
        </h1>
        <p className="text-charcoal/70 mt-2">
          Pick a tool to keep building, or open a recent project below.
        </p>
      </section>

      <section>
        <h2 className="serif text-2xl text-navy mb-4">Your tools</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <ToolTile
            href="/onboarding"
            title="Client Onboarding Builder"
            blurb="Generate a branded welcome sequence, intake form, kickoff checklist, and timeline — from one short brief."
            status={`${kitCount} kit${kitCount === 1 ? '' : 's'} · ${credits} credit${credits === 1 ? '' : 's'} left`}
            ready
          />
          <ToolTile
            href="#"
            title="SOP Builder"
            blurb="Turn a messy brain-dump into a clean, repeatable SOP. Migrating in next."
            status="Coming soon"
          />
          <ToolTile
            href="#"
            title="Founder Clarity"
            blurb="Free quick-clarity exercise — coming back as a Hub module."
            status="Coming soon"
          />
        </div>
      </section>

      <section>
        <h2 className="serif text-2xl text-navy mb-4">Recent activity</h2>
        {kits && kits.length > 0 ? (
          <ul className="divide-y divide-navy/10 border border-navy/10 rounded-lg overflow-hidden bg-white/60">
            {kits.map((k) => (
              <li key={k.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/onboarding/${k.id}`}
                    className="text-navy hover:text-clay"
                  >
                    {k.name}
                  </Link>
                  <p className="text-xs text-charcoal/60">
                    {k.status} · {k.is_unlocked ? 'unlocked' : 'locked'}
                  </p>
                </div>
                <span className="text-xs text-charcoal/60">
                  {new Date(k.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-charcoal/60">
            Nothing here yet. Start with the{' '}
            <Link href="/onboarding/new" className="text-clay hover:underline">
              Onboarding Builder
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}

function ToolTile({
  href,
  title,
  blurb,
  status,
  ready,
}: {
  href: string;
  title: string;
  blurb: string;
  status: string;
  ready?: boolean;
}) {
  const Wrapper: React.ElementType = ready ? Link : 'div';
  return (
    <Wrapper
      href={href}
      className={`block rounded-xl border border-navy/10 p-5 bg-white/60 transition ${
        ready ? 'hover:border-clay hover:shadow-sm cursor-pointer' : 'opacity-60'
      }`}
    >
      <h3 className="serif text-xl text-navy">{title}</h3>
      <p className="text-sm text-charcoal/70 mt-2">{blurb}</p>
      <p className="text-xs text-sage mt-4 uppercase tracking-wider">{status}</p>
    </Wrapper>
  );
}
