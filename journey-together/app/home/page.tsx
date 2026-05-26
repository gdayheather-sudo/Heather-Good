"use client";

import { AppFrame } from "@/components/AppFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TripCard } from "@/components/TripCard";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/utils";
import { MessageCircle, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { activeUser, trips, bookings, users } = useStore();

  if (activeUser.role === "admin") {
    return (
      <AppFrame>
        <Card>
          <p className="font-semibold">You're signed in as an admin.</p>
          <p className="mt-2 text-sm text-ink/70 dark:text-teal-100/70">
            Open the admin dashboard on a wider screen.
          </p>
          <Link href="/admin">
            <Button block className="mt-4">Go to admin dashboard</Button>
          </Link>
        </Card>
      </AppFrame>
    );
  }

  if (activeUser.role === "companion") {
    const myTrips = trips.filter((t) => t.companionId === activeUser.id);
    const myBookings = bookings.filter((b) => b.companionId === activeUser.id);
    const pending = myBookings.filter((b) => b.status === "pending");
    const upcoming = myBookings.filter((b) =>
      ["confirmed", "in-progress"].includes(b.status)
    );

    return (
      <AppFrame>
        <h1 className="text-2xl font-extrabold tracking-tight">
          G'day {activeUser.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
          {pending.length
            ? `${pending.length} request${pending.length === 1 ? "" : "s"} waiting on you`
            : "No new requests right now."}
        </p>

        {pending.length > 0 && (
          <section className="mt-5">
            <h2 className="font-bold text-lg mb-2">Pending requests</h2>
            <div className="space-y-3">
              {pending.map((b) => {
                const requester = users.find((u) => u.id === b.requesterId);
                const trip = trips.find((t) => t.id === b.tripId);
                if (!trip) return null;
                return (
                  <Card key={b.id}>
                    <div className="flex items-start gap-3">
                      <Avatar seed={b.requesterId} label={requester?.name} />
                      <div className="flex-1">
                        <p className="font-bold">{requester?.name}</p>
                        <p className="text-sm text-ink/70 dark:text-teal-100/70">
                          wants to join your {trip.mode} trip
                          <br />
                          {formatWhen(trip.departAt)}
                        </p>
                      </div>
                      <Badge tone="amber">{b.matchScore}% match</Badge>
                    </div>
                    <div className="mt-3">
                      <Link href={`/trips/${trip.id}?booking=${b.id}`}>
                        <Button size="sm" block>
                          Review
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Coming up</h2>
            <Link href="/trips/post" className="text-sm font-semibold text-teal-600 dark:text-amber-300 inline-flex items-center gap-1">
              <Plus className="h-4 w-4" aria-hidden /> Offer trip
            </Link>
          </div>
          {upcoming.length === 0 && myTrips.length === 0 && (
            <Card>
              <p className="text-ink/80 dark:text-teal-100/80">
                You haven't offered a trip yet. Even a regular commute helps —
                give it a go.
              </p>
              <Link href="/trips/post">
                <Button block className="mt-3">
                  Offer my first trip
                </Button>
              </Link>
            </Card>
          )}
          <div className="space-y-3">
            {upcoming.map((b) => {
              const trip = trips.find((t) => t.id === b.tripId);
              if (!trip) return null;
              return (
                <TripCard
                  key={b.id}
                  trip={trip}
                  href={`/trips/${trip.id}?booking=${b.id}`}
                  trailing={
                    <Badge tone="teal">
                      Booked: {users.find((u) => u.id === b.requesterId)?.name}
                    </Badge>
                  }
                />
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-bold text-lg mb-2">My regular journeys</h2>
          {myTrips.length === 0 ? (
            <p className="text-sm text-ink/60 dark:text-teal-100/60">
              No regular trips yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} href={`/trips/${trip.id}`} />
              ))}
            </div>
          )}
        </section>
      </AppFrame>
    );
  }

  // requester
  const myBookings = bookings.filter((b) => b.requesterId === activeUser.id);
  const upcoming = myBookings.filter((b) =>
    ["pending", "confirmed", "in-progress"].includes(b.status)
  );
  const past = myBookings.filter((b) =>
    ["completed", "rated"].includes(b.status)
  );

  return (
    <AppFrame>
      <h1 className="text-2xl font-extrabold tracking-tight">
        Hi {activeUser.name.split(" ")[0]}
      </h1>
      <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
        Where are you headed?
      </p>

      <Link href="/trips/request">
        <Button block size="lg" className="mt-4">
          <Search className="h-5 w-5" aria-hidden /> Find a companion
        </Button>
      </Link>

      <section className="mt-6">
        <h2 className="font-bold text-lg mb-2">Your trips</h2>
        {upcoming.length === 0 && (
          <Card>
            <p className="text-ink/80 dark:text-teal-100/80">
              Nothing booked yet. Try finding a trip — there are companions
              already heading your way.
            </p>
          </Card>
        )}
        <div className="space-y-3">
          {upcoming.map((b) => {
            const trip = trips.find((t) => t.id === b.tripId);
            if (!trip) return null;
            return (
              <TripCard
                key={b.id}
                trip={trip}
                href={`/trips/${trip.id}?booking=${b.id}`}
                trailing={
                  <div className="flex items-center gap-2">
                    <Badge tone={b.status === "confirmed" ? "success" : b.status === "in-progress" ? "amber" : "neutral"}>
                      {b.status}
                    </Badge>
                    <Link
                      href={`/trips/${trip.id}?booking=${b.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-teal-600 dark:text-amber-300"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> Message
                    </Link>
                  </div>
                }
              />
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold text-lg mb-2">Past trips</h2>
          <div className="space-y-3">
            {past.map((b) => {
              const trip = trips.find((t) => t.id === b.tripId);
              if (!trip) return null;
              return (
                <TripCard
                  key={b.id}
                  trip={trip}
                  href={`/trips/${trip.id}?booking=${b.id}`}
                  trailing={<Badge tone="neutral">{b.status}</Badge>}
                />
              );
            })}
          </div>
        </section>
      )}
    </AppFrame>
  );
}
