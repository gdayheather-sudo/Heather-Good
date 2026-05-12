import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shared/app-shell';

// Layout for every authed route. Middleware already redirects unauthed users,
// but we re-check here so Server Components downstream always have a user.
export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  return <AppShell user={{ email: user.email ?? '' }}>{children}</AppShell>;
}
