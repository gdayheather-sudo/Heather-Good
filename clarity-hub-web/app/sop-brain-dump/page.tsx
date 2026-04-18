import Wave from "@/components/Wave";

export const metadata = {
  title: "Free SOP Brain Dump Workflow — The Clarity Hub",
  description:
    "The one-hour prompt that pulls the process out of your head and onto the page. Free.",
};

const FORMSPREE_ENDPOINT = "https://formspree.io/f/FORMSPREE_ENDPOINT";

export default function SopBrainDumpPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-sage mb-6">
          Free workflow
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight">
          The SOP Brain Dump Workflow
        </h1>
        <p className="mt-6 text-lg text-charcoal/80 leading-relaxed">
          A one-hour prompt that pulls the process already living in your head
          onto the page — so the next person in the seat can actually do the
          thing.
        </p>
      </section>

      <section
        aria-labelledby="whats-inside"
        className="max-w-3xl mx-auto px-6 py-8"
      >
        <h2 id="whats-inside" className="font-serif text-2xl text-navy mb-5">
          What you&apos;ll get
        </h2>
        <ul className="space-y-4 text-charcoal/85 leading-relaxed">
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 inline-block w-2 h-2 rounded-full bg-clay shrink-0"
            />
            <span>
              <strong className="text-navy">The prompt sequence.</strong> Five
              questions I ask every client in their first session. You answer
              them out loud (voice note or typing) and the SOP writes itself.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 inline-block w-2 h-2 rounded-full bg-clay shrink-0"
            />
            <span>
              <strong className="text-navy">A fill-in template.</strong> The
              exact structure I use — trigger, steps, decisions, edge cases,
              handover notes. Plain language, no jargon.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 inline-block w-2 h-2 rounded-full bg-clay shrink-0"
            />
            <span>
              <strong className="text-navy">A short follow-up email.</strong>{" "}
              One message from me a week later, with the two questions that
              usually come up once you&apos;ve tried it.
            </span>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="who-its-for"
        className="max-w-3xl mx-auto px-6 py-8"
      >
        <h2 id="who-its-for" className="font-serif text-2xl text-navy mb-3">
          Who it&apos;s for
        </h2>
        <p className="text-charcoal/85 leading-relaxed">
          Service-based founders running teams of one to twenty, whose
          operations live mostly in their heads and a handful of messy Google
          Docs. If you&apos;ve ever thought{" "}
          <em>&quot;it&apos;s faster if I just do it&quot;</em> — this is for
          you.
        </p>
      </section>

      <section
        aria-labelledby="signup"
        className="max-w-xl mx-auto px-6 py-10"
      >
        <div className="bg-white/60 border border-sage/30 rounded-2xl p-8 shadow-sm">
          <h2 id="signup" className="font-serif text-2xl text-navy mb-3">
            Send it to my inbox
          </h2>
          <p className="text-charcoal/75 text-sm mb-6">
            You&apos;ll get the workflow straight away, and one follow-up a
            week later. No spam, no funnel, unsubscribe any time.
          </p>

          <form
            action={FORMSPREE_ENDPOINT}
            method="POST"
            className="space-y-4"
            aria-label="Sign up for the SOP Brain Dump Workflow"
          >
            <div>
              <label htmlFor="email" className="block text-sm mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                placeholder="your@email.com"
                className="w-full rounded-lg border border-sage/40 bg-warm-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage/60"
              />
            </div>

            <input
              type="hidden"
              name="_subject"
              value="New SOP Brain Dump signup"
            />
            <input
              type="hidden"
              name="_next"
              value="https://clarityhub.com.au/thank-you"
            />

            <button type="submit" className="btn-clay w-full">
              Send me the workflow
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-charcoal/55 text-center">
          Social proof coming soon — early readers&apos; notes land here.
        </p>
      </section>

      <Wave className="w-full h-16 opacity-70" />
    </>
  );
}
