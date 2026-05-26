"use client";

import { Trip } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatWhen, modeLabel } from "@/lib/utils";
import { Avatar } from "./ui/Avatar";
import { StarRating } from "./StarRating";
import Link from "next/link";
import { Bus, Car, Footprints, TramFront, TrainFront, Repeat } from "lucide-react";

const ICONS = {
  bus: Bus,
  car: Car,
  tram: TramFront,
  train: TrainFront,
  walking: Footprints,
};

function recurrenceLabel(r: Trip["recurrence"]): string {
  if (r.kind === "one-off") return "One-off";
  if (r.kind === "daily") return "Daily";
  if (r.kind === "weekly") return "Weekly";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return r.days.map((d) => days[d]).join(" · ");
}

export function TripCard({
  trip,
  href,
  trailing,
}: {
  trip: Trip;
  href?: string;
  trailing?: React.ReactNode;
}) {
  const { users } = useStore();
  const companion = users.find((u) => u.id === trip.companionId);
  const Icon = ICONS[trip.mode];
  const Wrapper = (href ? Link : "div") as any;
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className="block rounded-2xl bg-white dark:bg-ink-soft shadow-card border border-ink/5 dark:border-white/5 p-4 hover:border-teal-500/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar seed={trip.companionId} label={companion?.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold truncate">{companion?.name}</span>
            {companion && <StarRating value={companion.rating} count={companion.ratingCount} />}
          </div>
          <div className="text-xs text-ink/60 dark:text-teal-100/60 inline-flex items-center gap-1.5 mt-0.5">
            <Icon className="h-3.5 w-3.5" aria-hidden /> {modeLabel(trip.mode)}
            <span aria-hidden>·</span>
            <Repeat className="h-3.5 w-3.5" aria-hidden /> {recurrenceLabel(trip.recurrence)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold">${trip.fee}</div>
          <div className="text-[10px] uppercase tracking-wider text-ink/50 dark:text-teal-100/50 font-bold">
            thank-you
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm">
        <div className="font-semibold">{formatWhen(trip.departAt)}</div>
        <div className="text-ink/70 dark:text-teal-100/70 mt-1 leading-snug">
          <span className="text-teal-600 dark:text-teal-200 font-semibold">From</span>{" "}
          {trip.start.label}
          <br />
          <span className="text-amber-600 dark:text-amber-300 font-semibold">To</span>{" "}
          {trip.end.label}
        </div>
      </div>
      {trip.notes && (
        <p className="mt-2 text-sm text-ink/70 dark:text-teal-100/70 italic">
          “{trip.notes}”
        </p>
      )}
      {trailing && <div className="mt-3">{trailing}</div>}
    </Wrapper>
  );
}
