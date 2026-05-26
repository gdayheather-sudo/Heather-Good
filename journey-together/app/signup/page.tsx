"use client";

import Link from "next/link";
import { AppFrame } from "@/components/AppFrame";
import { Card } from "@/components/ui/Card";
import { HandHeart, Users } from "lucide-react";

export default function SignupPage() {
  return (
    <AppFrame>
      <h1 className="text-2xl font-extrabold tracking-tight">
        Pick what fits you
      </h1>
      <p className="mt-1 text-ink/70 dark:text-teal-100/70">
        You can be both, but let's start with one.
      </p>

      <div className="mt-6 space-y-4">
        <Link href="/onboarding/requester" className="block focus-visible:outline-none">
          <Card className="hover:border-teal-500 focus-within:border-teal-500 transition-colors">
            <div className="flex items-start gap-4">
              <span className="rounded-2xl bg-teal-500 text-white p-3" aria-hidden>
                <HandHeart className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-bold">I want a companion</h2>
                <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                  I'm a person with disability (or booking for someone). I'd
                  love help getting somewhere.
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/onboarding/companion" className="block focus-visible:outline-none">
          <Card className="hover:border-teal-500 focus-within:border-teal-500 transition-colors">
            <div className="flex items-start gap-4">
              <span className="rounded-2xl bg-amber-400 text-ink p-3" aria-hidden>
                <Users className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <h2 className="text-lg font-bold">I want to be a companion</h2>
                <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
                  I'm an adult who travels regularly and I'd be happy to share
                  the journey.
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <p className="mt-8 text-sm text-ink/60 dark:text-teal-100/60">
        This is a prototype — your details aren't saved beyond this device.
      </p>
    </AppFrame>
  );
}
