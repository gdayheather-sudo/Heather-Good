import Link from "next/link";
import Wave from "@/components/Wave";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <p className="text-sm uppercase tracking-[0.2em] text-sage mb-6">
            The Clarity Hub
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-tight max-w-3xl">
            Simplifying AI for small business — so the tech works for you,
            not the other way around.
          </h1>
          <p className="mt-6 text-lg text-charcoal/80 max-w-2xl">
            Document what&apos;s in your head, automate what drains you, and
            finally hand things off — without losing the care that made your
            business worth building.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/sop-brain-dump" className="btn-clay">
              Get the free SOP Brain Dump
            </Link>
            <Link href="/about" className="btn-ghost">
              About Heather
            </Link>
          </div>
        </div>

        <Wave className="absolute -bottom-2 left-0 w-full h-24 opacity-80" />
      </section>

      <section
        aria-labelledby="streams"
        className="max-w-6xl mx-auto px-6 py-20"
      >
        <h2 id="streams" className="sr-only">
          What we do
        </h2>

        <div className="grid gap-10 sm:grid-cols-3">
          <article>
            <p className="text-xs uppercase tracking-[0.18em] text-clay mb-3">
              01 · Document
            </p>
            <h3 className="font-serif text-2xl mb-3">
              The SOPs in your head
            </h3>
            <p className="text-charcoal/80 leading-relaxed">
              Pull the how-we-do-it-here out of your brain and onto the page —
              in plain language your team will actually use.
            </p>
          </article>

          <article>
            <p className="text-xs uppercase tracking-[0.18em] text-clay mb-3">
              02 · Automate
            </p>
            <h3 className="font-serif text-2xl mb-3">
              The tasks that drain you
            </h3>
            <p className="text-charcoal/80 leading-relaxed">
              Small, thoughtful AI workflows that take the admin off your plate
              — without turning your business into a robot.
            </p>
          </article>

          <article>
            <p className="text-xs uppercase tracking-[0.18em] text-clay mb-3">
              03 · Hand off
            </p>
            <h3 className="font-serif text-2xl mb-3">
              The work that isn&apos;t yours
            </h3>
            <p className="text-charcoal/80 leading-relaxed">
              Clear playbooks and onboarding so the next person in the seat
              starts strong — and you get your evenings back.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-navy text-warm-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-warm-white mb-4">
            Start with one hour and one workflow.
          </h2>
          <p className="text-warm-white/80 max-w-xl mx-auto mb-8">
            The SOP Brain Dump is the prompt I use with every new client in our
            first session together. Steal it — it&apos;s free.
          </p>
          <Link
            href="/sop-brain-dump"
            className="btn-clay"
            aria-label="Get the free SOP Brain Dump workflow"
          >
            Get the free SOP Brain Dump
          </Link>
        </div>
      </section>
    </>
  );
}
