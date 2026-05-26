"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/StarRating";
import { VerificationBadges } from "@/components/VerificationBadges";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function ProfileView({ userId, self }: { userId: string; self?: boolean }) {
  const { users, bookings, trips, resetData } = useStore();
  const user = users.find((u) => u.id === userId);
  if (!user) return <p>Not found.</p>;

  const ratings = bookings
    .flatMap((b) => b.ratings.map((r) => ({ ...r, booking: b })))
    .filter((r) =>
      user.role === "companion" ? r.booking.companionId === user.id : r.booking.requesterId === user.id
    )
    .filter((r) => r.by !== user.id) // only ratings *of* this user
    .slice(0, 6);

  const trips_ = trips.filter((t) => t.companionId === user.id);

  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <Avatar seed={user.id} label={user.name} size={72} />
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{user.name}</h1>
            <p className="text-sm text-ink/70 dark:text-teal-100/70">{user.region}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StarRating value={user.rating} count={user.ratingCount} />
              <Badge tone="teal">{user.role}</Badge>
            </div>
          </div>
        </div>
        <p className="mt-3 text-ink/85 dark:text-teal-100/85 italic">“{user.bio}”</p>
        <div className="mt-3">
          <VerificationBadges user={user} />
        </div>
        {self && (
          <Link href="/about" className="block mt-4">
            <Button variant="outline" block>About Journey Together</Button>
          </Link>
        )}
      </Card>

      {user.comfortAreas && user.comfortAreas.length > 0 && (
        <Card className="mt-3">
          <p className="font-bold">Comfort areas</p>
          <p className="text-xs text-ink/60 dark:text-teal-100/60 mb-2">
            What this companion is confident assisting with
          </p>
          <div className="flex flex-wrap gap-2">
            {user.comfortAreas.map((a) => (
              <Badge key={a} tone="amber">
                {a.replace(/-/g, " ")}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {user.accessibility && (
        <Card className="mt-3">
          <p className="font-bold">Accessibility profile</p>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="font-semibold">Mobility</dt>
              <dd className="text-ink/80 dark:text-teal-100/80 capitalize">
                {user.accessibility.mobility.replace(/-/g, " ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Sensory</dt>
              <dd className="text-ink/80 dark:text-teal-100/80 capitalize">
                {user.accessibility.sensory.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Communication</dt>
              <dd className="text-ink/80 dark:text-teal-100/80 capitalize">
                {user.accessibility.communicationStyle}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Cognitive support</dt>
              <dd className="text-ink/80 dark:text-teal-100/80">
                {user.accessibility.cognitiveSupport}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Anxiety triggers</dt>
              <dd className="text-ink/80 dark:text-teal-100/80">
                {user.accessibility.anxietyTriggers}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {user.trustedContact && self && (
        <Card className="mt-3">
          <p className="font-bold">Trusted contact</p>
          <p className="mt-1">{user.trustedContact.name} ({user.trustedContact.relationship})</p>
          <p className="text-sm text-ink/70 dark:text-teal-100/70">
            {user.trustedContact.phone}
          </p>
        </Card>
      )}

      {user.reviewTags && user.reviewTags.length > 0 && (
        <Card className="mt-3">
          <p className="font-bold">Often called</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {user.reviewTags.map((t) => (
              <Badge key={t} tone="teal">{t}</Badge>
            ))}
          </div>
        </Card>
      )}

      {ratings.length > 0 && (
        <Card className="mt-3">
          <p className="font-bold">Recent reviews</p>
          <ul className="mt-2 space-y-3">
            {ratings.map((r, i) => (
              <li key={i} className="border-l-4 border-teal-500 pl-3">
                <StarRating value={r.stars} />
                {r.comment && <p className="text-sm italic mt-1">“{r.comment}”</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {user.role === "companion" && trips_.length > 0 && (
        <Card className="mt-3">
          <p className="font-bold">Regular journeys</p>
          <ul className="mt-2 space-y-2 text-sm">
            {trips_.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className="truncate">{t.start.label} → {t.end.label}</span>
                <span className="text-ink/60 dark:text-teal-100/60 capitalize whitespace-nowrap">{t.mode}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {self && (
        <Card className="mt-3 bg-amber-50 dark:bg-amber-500/10 border-amber-300/40">
          <p className="font-bold">Demo controls</p>
          <p className="text-sm mt-1">
            Wipe all locally-stored data and reseed the prototype.
          </p>
          <Button
            variant="outline"
            block
            className="mt-3"
            onClick={() => {
              if (confirm("Reset all local data?")) resetData();
            }}
          >
            Reset demo data
          </Button>
        </Card>
      )}
    </>
  );
}
