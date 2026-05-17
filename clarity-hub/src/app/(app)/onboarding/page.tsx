import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { availableCredits } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export default async function OnboardingHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: kits }, credits] = await Promise.all([
    supabase
      .from('kits')
      .select('id, name, status, is_unlocked, updated_at')
      .order('updated_at', { ascending: false }),
    availableCredits(supabase, user.id, 'onboarding_builder'),
  ]);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">
            Onboarding Builder
          </p>
          <h1 className="serif text-3xl text-navy">Your onboarding kits</h1>
          <p className="text-charcoal/70 mt-1 text-sm">
            {credits} unlock credit{credits === 1 ? '' : 's'} available.
          </p>
        </div>
        <Link
          href="/onboarding/new"
          className="bg-clay text-warm px-5 py-2.5 rounded-md hover:opacity-90"
        >
          New kit
        </Link>
      </div>

      {kits && kits.length > 0 ? (
        <ul className="divide-y divide-navy/10 border border-navy/10 rounded-lg bg-white/60">
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
        <div className="border border-dashed border-navy/20 rounded-lg p-10 text-center bg-white/40">
          <p className="text-charcoal/70 mb-4">No kits yet.</p>
          <Link
            href="/onboarding/new"
            className="bg-clay text-warm px-5 py-2.5 rounded-md hover:opacity-90"
          >
            Start your first kit
          </Link>
        </div>
      )}
    </div>
  );
}
