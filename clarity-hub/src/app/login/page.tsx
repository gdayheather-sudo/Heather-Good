'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const params = useSearchParams();
  const next = params.get('next') || '/home';
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="brand-wave min-h-screen flex items-center justify-center px-6">
      <div className="bg-white/70 backdrop-blur rounded-xl border border-navy/10 p-8 w-full max-w-md">
        <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">
          Clarity Hub
        </p>
        <h1 className="text-3xl text-navy mb-6">Sign in</h1>

        {sent ? (
          <p className="text-charcoal">
            Check your inbox for your sign-in link.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-charcoal/70">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 bg-warm focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </label>
            {error && <p className="text-clay text-sm">{error}</p>}
            <button
              type="submit"
              disabled={sending || !email}
              className="w-full bg-clay text-warm py-2.5 rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Continue with email'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
