"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  HandHeart,
  Map,
  Sparkles,
  Wallet,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EEF2F4] dark:bg-[#04121A] flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-ink to-teal-700 text-teal-50 px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 text-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Community, not rideshare
            </p>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Travel together. Arrive supported.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-teal-100/90 leading-relaxed">
              <strong>Journey Together</strong> connects people with disabilities to verified
              adult companions who are already going your way — on the train, the tram,
              the walk to the shops. A small thank-you contribution keeps it
              sustainable. No surge pricing. No strangers.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" variant="secondary">
                  Get started
                </Button>
              </Link>
              <Link href="/home">
                <Button size="lg" variant="outline" className="border-teal-100 text-teal-50 hover:bg-white/10">
                  Try the demo
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost" className="text-teal-50 hover:bg-white/10">
                  How it works
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-teal-100/70">
              Tip: use the <em>Sign in as…</em> picker in the top right to switch between
              roles.
            </p>
          </div>
        </section>

        {/* Differentiators */}
        <section className="px-6 py-14 max-w-5xl mx-auto grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Verified humans",
              body:
                "Every companion has a current Working With Children Check and NDIS Worker Screening. ID is verified against a live photo.",
            },
            {
              icon: Wallet,
              title: "Fees, not fares",
              body:
                "Capped contributions ($3–$25) recognise the companion's time. The platform isn't a business model — it's a kindness net.",
            },
            {
              icon: HandHeart,
              title: "Matched to your needs",
              body:
                "Your accessibility profile drives matching. You see why a companion's a good fit before you book.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl bg-white dark:bg-ink-soft shadow-card p-5 border border-ink/5 dark:border-white/5"
            >
              <Icon className="h-7 w-7 text-teal-500 dark:text-amber-300" aria-hidden />
              <h2 className="mt-3 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-ink/80 dark:text-teal-100/80 leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </section>

        {/* Distinction strip */}
        <section className="bg-amber-50 dark:bg-amber-500/10 border-y border-amber-300/40">
          <div className="max-w-5xl mx-auto px-6 py-10 grid gap-4 sm:grid-cols-2 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-200">
                What this is not
              </p>
              <h2 className="text-2xl font-extrabold mt-2 text-ink dark:text-teal-50">
                Not an Uber alternative.
              </h2>
            </div>
            <div className="text-ink/85 dark:text-teal-100/85 space-y-2">
              <p>
                Companions <strong>aren't drivers-for-hire</strong>. They're people already
                heading your way — to work, to uni, to the shops — offering a hand and some
                company.
              </p>
              <p>
                Fee caps keep it that way. Big enough to say thanks for the detour. Small
                enough that no-one's making a living off it.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-14 max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-center">
            How a trip happens
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Users,
                step: "1",
                title: "Tell us about you",
                body:
                  "Companions upload checks. Requesters share their accessibility profile and a trusted contact.",
              },
              {
                icon: Map,
                step: "2",
                title: "Match by route",
                body:
                  "We surface trips that already overlap with yours — within 2km of pickup and drop-off by default.",
              },
              {
                icon: HandHeart,
                step: "3",
                title: "Travel together",
                body:
                  "Message inside the app. Your trusted contact gets pinged when the trip starts. Rate each other after.",
              },
            ].map(({ icon: Icon, step, title, body }) => (
              <li
                key={title}
                className="rounded-2xl bg-white dark:bg-ink-soft shadow-card p-5 border border-ink/5 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-teal-500 text-white font-extrabold flex items-center justify-center">
                    {step}
                  </span>
                  <Icon className="h-6 w-6 text-amber-500 dark:text-amber-300 ml-auto" aria-hidden />
                </div>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-1 text-ink/80 dark:text-teal-100/80 text-sm leading-relaxed">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="bg-ink text-teal-100/70 text-sm py-8 mt-8">
          <div className="max-w-5xl mx-auto px-6 flex flex-wrap gap-4 items-center justify-between">
            <p>© Journey Together — a community service prototype.</p>
            <nav className="flex gap-4">
              <Link href="/about" className="hover:text-amber-300">About</Link>
              <Link href="/admin" className="hover:text-amber-300">Admin</Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}
