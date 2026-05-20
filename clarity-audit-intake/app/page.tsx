import Link from "next/link";
import { WaveDots } from "@/components/WaveDots";

export default function HomePage() {
  return (
    <main className="content-z mx-auto flex min-h-screen max-w-prose flex-col items-center justify-center px-6 text-center">
      <div className="relative w-full">
        <WaveDots className="absolute -top-16 right-0 w-32 opacity-50 sm:w-40" />
      </div>
      <p className="font-display text-sm uppercase tracking-[0.18em] text-clay">
        The Clarity Hub
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-charcoal sm:text-5xl">
        The <em className="italic text-clay">Clarity Audit</em>
      </h1>
      <p className="mt-6 max-w-md text-base font-light text-[var(--muted)]">
        This is the pre-audit intake. You&rsquo;ll have received a private link
        from Heather to begin. If you don&rsquo;t have one yet, check your email.
      </p>
      <Link
        href="mailto:hello@clarityhub.com.au"
        className="mt-8 text-sm text-navy underline underline-offset-4 hover:text-clay"
      >
        hello@clarityhub.com.au
      </Link>
    </main>
  );
}
