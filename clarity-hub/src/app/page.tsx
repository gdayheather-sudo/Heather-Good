import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Landing() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  return (
    <main className="brand-wave min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-sage uppercase tracking-[0.2em] text-xs mb-4">
          The Clarity Hub
        </p>
        <h1 className="text-5xl md:text-6xl text-navy mb-6">
          Messy in, clean system out.
        </h1>
        <p className="text-charcoal/80 text-lg mb-10">
          A small kit of tools that turn the work in a founder&rsquo;s head into
          systems clients actually see.
        </p>
        <Link
          href="/login"
          className="inline-block bg-clay text-warm px-6 py-3 rounded-md hover:opacity-90 transition"
        >
          Continue with email
        </Link>
      </div>
    </main>
  );
}
