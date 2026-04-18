import Link from "next/link";
import Wave from "@/components/Wave";

export const metadata = {
  title: "Thank you — The Clarity Hub",
  description:
    "Your SOP Brain Dump Workflow is on its way. Here's what to expect next.",
};

export default function ThankYouPage() {
  return (
    <>
      <section className="max-w-2xl mx-auto px-6 pt-24 pb-10 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-sage mb-6">
          You&apos;re in
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight">
          Check your inbox — it&apos;s on the way.
        </h1>
        <p className="mt-6 text-lg text-charcoal/80 leading-relaxed">
          The SOP Brain Dump Workflow is landing now from{" "}
          <strong className="text-navy">hello@clarityhub.com.au</strong>. If
          it&apos;s hiding, peek in Promotions or Spam and drag it to your
          main inbox — future notes will find you properly.
        </p>
      </section>

      <section
        aria-labelledby="next"
        className="max-w-2xl mx-auto px-6 py-8"
      >
        <h2 id="next" className="font-serif text-2xl text-navy mb-5">
          What to expect next
        </h2>
        <ol className="space-y-4 text-charcoal/85 leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-navy">Today.</strong> Open the workflow,
            pick one annoying recurring task, and run the five prompts. Most
            people have their first draft SOP in under an hour.
          </li>
          <li>
            <strong className="text-navy">Next week.</strong> A short follow-up
            from me with the two questions that always come up after the first
            attempt. Reply — it goes straight to my inbox.
          </li>
          <li>
            <strong className="text-navy">After that.</strong> Occasional
            letters when I&apos;ve built something worth sharing. Never more
            than twice a month.
          </li>
        </ol>
      </section>

      <section className="relative">
        <Wave className="w-full h-16 opacity-70" />
        <div className="max-w-2xl mx-auto px-6 py-14 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl mb-4">
            Want the occasional thought in between?
          </h2>
          <p className="text-charcoal/75 mb-8 max-w-prose mx-auto">
            I share the in-progress version of this work on LinkedIn — SOP
            examples, small AI workflows that actually help, and the odd
            honest note from building in public.
          </p>
          <a
            href="https://www.linkedin.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-clay"
          >
            Follow on LinkedIn
          </a>
          <div className="mt-6">
            <Link
              href="/"
              className="text-sm text-navy underline underline-offset-4 hover:text-clay"
            >
              Back to the home page
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
