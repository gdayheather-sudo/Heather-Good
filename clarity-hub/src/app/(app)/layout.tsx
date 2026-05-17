import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-navy/10 bg-warm/80 backdrop-blur">
        <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/home" className="serif text-2xl text-navy">
            Clarity Hub
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/home" className="hover:text-clay">Home</Link>
            <Link href="/account" className="hover:text-clay">Account</Link>
            <Link href="/billing" className="hover:text-clay">Billing</Link>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
