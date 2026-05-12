import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

// Refreshes the Supabase auth session on every request and enforces the
// signed-in / signed-out route boundary.
//
// Routes:
//   /                     public marketing
//   /signin               public; redirect to /dashboard if already signed in
//   /auth/callback        public; magic-link landing
//   /auth/signout         public; clears the session
//   /share/[token]        public; served via get_shared_sop()
//   everything else (/dashboard, /sops/*, /settings/*) requires auth.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() — NOT getSession() — because getUser() validates the
  // token against the auth server. getSession() trusts the cookie blindly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/share');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/signin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
