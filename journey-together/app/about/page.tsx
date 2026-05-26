"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Tooltip } from "@/components/ui/Tooltip";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#EEF2F4] dark:bg-[#04121A]">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight">
          About Journey Together
        </h1>
        <p className="mt-3 text-lg text-ink/80 dark:text-teal-100/80 leading-relaxed">
          Getting from A to B shouldn't be the hardest part of someone's day.
          Journey Together is a community of verified adult companions who are
          already travelling — and a way to gently match them with people who'd
          appreciate company along the route.
        </p>

        <h2 className="mt-10 text-2xl font-bold">Who it's for</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5 text-ink/85 dark:text-teal-100/85">
          <li>
            <strong>People with disabilities</strong> (and guardians booking on their
            behalf) who want a trusted hand on a particular journey.
          </li>
          <li>
            <strong>Adults</strong> who already commute, walk, or drive a route and are
            happy to share it.
          </li>
        </ul>

        <h2 className="mt-10 text-2xl font-bold">The fee philosophy</h2>
        <Card className="mt-3 bg-amber-50 dark:bg-amber-500/10 border-amber-300/40">
          <p className="font-semibold">
            Fees are a thank-you, not a fare.
          </p>
          <p className="mt-2 text-ink/85 dark:text-teal-100/85">
            We cap contributions to keep this a community service, not a business
            for either side. Companions absorb their own commute cost — they were
            already going. The fee says “thanks for the patience and care”.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>· Walking companion — up to $5</li>
            <li>· Train, bus or tram — up to $10</li>
            <li>· Car, route overlap ≤ 10 km — up to $15</li>
            <li>· Car, route overlap &gt; 10 km — up to $25</li>
          </ul>
        </Card>

        <h2 className="mt-10 text-2xl font-bold">Safety</h2>
        <p className="mt-3 text-ink/85 dark:text-teal-100/85 leading-relaxed">
          Every companion holds a current{" "}
          <Tooltip
            label="WWCC"
            text="Working With Children Check — a national background check required to work or volunteer with under-18s."
          >
            <span className="underline decoration-dotted">WWCC</span>
          </Tooltip>{" "}
          and{" "}
          <Tooltip
            label="WWDC"
            text="Working With Disability Check (NDIS Worker Screening) — a national check for people supporting NDIS participants."
          >
            <span className="underline decoration-dotted">WWDC</span>
          </Tooltip>
          . ID is verified against a live photo. When a trip starts, the requester's
          trusted contact is notified. An SOS button is always visible during a trip.
        </p>

        <h2 className="mt-10 text-2xl font-bold">Eligibility</h2>
        <ul className="mt-3 space-y-2 list-disc pl-5 text-ink/85 dark:text-teal-100/85">
          <li>You must be 18 or older to register as a companion.</li>
          <li>Under-18s can be requesters with a guardian-managed account.</li>
          <li>
            Requesters provide an{" "}
            <Tooltip
              label="NDIS number"
              text="National Disability Insurance Scheme participant number. Helps confirm eligibility for support — not required to use the platform, but helps with matching."
            >
              <span className="underline decoration-dotted">NDIS number</span>
            </Tooltip>{" "}
            (optional), accessibility profile, and at least one trusted contact.
          </li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-teal-500 text-white font-semibold px-5 py-3 hover:bg-teal-600"
          >
            Get started
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-xl border-2 border-ink dark:border-teal-100 px-5 py-3 font-semibold"
          >
            Open the demo
          </Link>
        </div>
      </main>
    </div>
  );
}
