import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { Button } from '@/components/ui/button';

interface AppShellProps {
  user: { email: string } | null;
  children: React.ReactNode;
}

// Authed app chrome — brand, primary nav, sign-out. Kept deliberately spare;
// future Hub apps drop in here without rewriting.
export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper-100">
      <header className="border-b border-charcoal/10 bg-paper-50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandMark />
          </Link>

          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden text-charcoal/60 sm:block">{user.email}</span>
              <form action="/auth/signout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
