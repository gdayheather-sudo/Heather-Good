import Link from "next/link";
import Wave from "@/components/Wave";

export const metadata = {
  title: "About — The Clarity Hub",
  description:
    "Heather founded The Clarity Hub after a decade of being the one who knew how everything worked. Here's why.",
};

export default function AboutPage() {
  return (
    <>
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-sage mb-6">
          About
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight">
          Hi, I&apos;m Heather.
        </h1>
        <p className="mt-6 text-lg text-charcoal/80 leading-relaxed">
          I spent a decade being the person who knew how everything worked —
          the one with the answers, the workarounds, and the half-drafted
          documents in a folder nobody could find. It made me good at my job.
          It also made me the bottleneck.
        </p>
      </section>

      <figure className="max-w-3xl mx-auto px-6">
        <div
          role="img"
          aria-label="Portrait of Heather"
          className="aspect-[4/5] sm:aspect-[5/4] w-full rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center text-charcoal/40 font-serif text-lg"
        >
          Photo coming soon
        </div>
      </figure>

      <section className="max-w-3xl mx-auto px-6 py-12 space-y-6 text-charcoal/85 leading-relaxed">
        <p>
          The Clarity Hub is what I built once I figured out the problem
          wasn&apos;t that my clients didn&apos;t have good processes — they
          had great ones. The processes just lived in the founder&apos;s head,
          and handing them over felt like extracting a tooth with tweezers.
        </p>
        <p>
          I help service-based founders (one to twenty people, usually female,
          often brilliant and quietly exhausted) document what they already do,
          automate the small admin that drags them down, and finally hand work
          off without the whole operation wobbling.
        </p>
        <p>
          My approach is human-first and practical. AI is a tool, not a
          personality. SOPs are a gift to your team, not a cage. And clarity
          isn&apos;t about doing more — it&apos;s about finally putting the
          thing down.
        </p>
      </section>

      <section aria-labelledby="values" className="max-w-3xl mx-auto px-6 py-12">
        <h2 id="values" className="font-serif text-2xl text-navy mb-6">
          What I hold to
        </h2>
        <ul className="space-y-4 text-charcoal/85 leading-relaxed">
          <li>
            <strong className="text-navy">Warm over slick.</strong> Systems
            should feel like a calm hand on the shoulder, not a slack channel
            at 10pm.
          </li>
          <li>
            <strong className="text-navy">Specific over clever.</strong>{" "}
            Real words, real examples, real numbers. The shortcuts come later.
          </li>
          <li>
            <strong className="text-navy">Enough, not more.</strong> I&apos;d
            rather you finish one SOP this week than start five.
          </li>
        </ul>
      </section>

      <section className="relative">
        <Wave className="w-full h-16 opacity-70" />
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl mb-4">
            Try the workflow I start every client with.
          </h2>
          <p className="text-charcoal/75 mb-8 max-w-prose mx-auto">
            The SOP Brain Dump gets your first real process on paper in under
            an hour. No fluff, no cute templates — just the prompts that make
            it fall out of your head.
          </p>
          <Link href="/sop-brain-dump" className="btn-clay">
            Get the free SOP Brain Dump
          </Link>
        </div>
      </section>
    </>
  );
}
