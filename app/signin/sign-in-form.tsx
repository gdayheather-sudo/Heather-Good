'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/client';
import { env } from '@/lib/env';

export function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const supabase = createClient();
    const redirectTo = `${env.appUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-sm text-charcoal/70">
        <p className="font-medium text-charcoal">Check your inbox.</p>
        <p className="mt-1">
          We sent a magic link to <strong>{email}</strong>. Open it on this device to sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? 'Sending…' : 'Send magic link'}
      </Button>
    </form>
  );
}
