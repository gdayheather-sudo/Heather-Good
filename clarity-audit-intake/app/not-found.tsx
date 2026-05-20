import Link from "next/link";
import { WaveDots } from "@/components/WaveDots";

export default function NotFound() {
  return (
    <main className="content-z mx-auto flex min-h-screen max-w-prose flex-col items-center justify-center px-6 text-center">
      <div className="relative w-full max-w-md">
        <WaveDots className="absolute -top-24 left-1/2 w-40 -translate-x-1/2 opacity-50" />
      </div>
      <p className="font-display text-sm uppercase tracking-[0.18em] text-clay">
        The Clarity Hub
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-charcoal sm:text-5xl">
        This link isn&rsquo;t valid.
      </h1>
      <p className="mt-6 max-w-md text-base text-[var(--muted)]">
        The intake link may have expired or been mistyped. Check the email from
        Heather, or get in touch and she&rsquo;ll sort you out.
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
