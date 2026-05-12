import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Magic-link landing. Supabase appends a one-time code; we exchange it for a
// session cookie, then redirect to ?next= (or /dashboard).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failureUrl = new URL('/signin', request.url);
    failureUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
