import Link from 'next/link';
import { BrandMark } from '@/components/shared/brand-mark';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInForm } from './sign-in-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper-100 px-6 py-12">
      <Link href="/" className="mb-8">
        <BrandMark className="text-2xl" />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            We&rsquo;ll email you a magic link. No password to remember.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-clay-50 px-3 py-2 text-sm text-clay-500">{error}</p>
          )}
          <SignInForm next={next ?? '/dashboard'} />
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-charcoal/50">
        By signing in you agree to our terms of service and privacy policy.
      </p>
    </div>
  );
}
