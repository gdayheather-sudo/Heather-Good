import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/shared/brand-mark';
import { WaveAndDots } from '@/components/shared/brand-decoration';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper-100">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <Link href="/signin">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center">
        <h1 className="font-serif text-5xl leading-tight text-charcoal sm:text-6xl">
          Walk through it.
          <br />
          Get back a clean SOP.
        </h1>

        <div className="mx-auto mt-8 w-32">
          <WaveAndDots />
        </div>

        <p className="mx-auto mt-8 max-w-xl text-lg text-charcoal/70">
          Talk through any process on your phone — snap photos as you go.
          Clarity transcribes, structures, and gives you a polished SOP you can
          share, follow, or run from.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/signin">
            <Button size="lg">Start free</Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-charcoal/50">
          3 SOPs free. No card required to start.
        </p>
      </main>
    </div>
  );
}
