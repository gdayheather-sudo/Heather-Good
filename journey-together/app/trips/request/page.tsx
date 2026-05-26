"use client";

import { AppFrame } from "@/components/AppFrame";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, FieldGroup, Input, Label, Select } from "@/components/ui/Field";
import { RouteDiagram } from "@/components/RouteDiagram";
import { StarRating } from "@/components/StarRating";
import { VerificationBadges } from "@/components/VerificationBadges";
import { findMatches, MatchResult } from "@/lib/matching";
import { useStore } from "@/lib/store";
import { TransportMode } from "@/lib/types";
import { formatWhen } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, MapPin, ShieldCheck } from "lucide-react";

const MODES: TransportMode[] = ["train", "tram", "bus", "car", "walking"];

export default function RequestTripPage() {
  const { activeUser, trips, users, addBooking, pushToast } = useStore();
  const router = useRouter();

  // Seed with sensible demo defaults so matches appear immediately.
  const [startLabel, setStartLabel] = useState("Footscray Station");
  const [startLat, setStartLat] = useState(-37.7993);
  const [startLng, setStartLng] = useState(144.8997);
  const [endLabel, setEndLabel] = useState("Southern Cross Station");
  const [endLat, setEndLat] = useState(-37.8183);
  const [endLng, setEndLng] = useState(144.9525);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [radius, setRadius] = useState(2);
  const [modePref, setModePref] = useState<TransportMode[]>([]);
  const [searched, setSearched] = useState(true);

  const whenIso = useMemo(() => {
    if (date && time) return new Date(`${date}T${time}:00`).toISOString();
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }, [date, time]);

  const results: MatchResult[] = useMemo(() => {
    if (!searched) return [];
    return findMatches(
      {
        start: { lat: startLat, lng: startLng, label: startLabel },
        end: { lat: endLat, lng: endLng, label: endLabel },
        whenIso,
        radiusKm: radius,
        modePreference: modePref,
        profile: activeUser.accessibility,
      },
      trips,
      users
    ).slice(0, 10);
  }, [searched, startLat, startLng, endLat, endLng, startLabel, endLabel, whenIso, radius, modePref, activeUser.accessibility, trips, users]);

  function toggleMode(m: TransportMode) {
    setModePref((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function presetFromBooking() {
    // Quick demo helper — prefill some other location
    setStartLabel("Coburg, Sydney Rd & Bell St");
    setStartLat(-37.7461);
    setStartLng(144.9619);
    setEndLabel("Flinders Street Station");
    setEndLat(-37.8126);
    setEndLng(144.9544);
  }

  function book(r: MatchResult) {
    const booking = addBooking({
      tripId: r.trip.id,
      requesterId: activeUser.id,
      companionId: r.companion.id,
      pickupOverlapKm: Math.round((radius - r.startDistanceKm) * 100) / 100,
      routeOverlapKm: Math.round(r.routeOverlapKm * 100) / 100,
      matchScore: r.score,
      paidHeldInEscrow: true,
    });
    pushToast({
      tone: "success",
      text: `Request sent to ${r.companion.name.split(" ")[0]}. Payment held in escrow.`,
    });
    router.push(`/trips/${r.trip.id}?booking=${booking.id}`);
  }

  if (activeUser.role !== "requester") {
    return (
      <AppFrame>
        <Card>
          <p className="font-bold">Only requesters can book trips.</p>
          <p className="mt-2 text-sm text-ink/70 dark:text-teal-100/70">
            Switch to a requester account using the picker in the header.
          </p>
        </Card>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <h1 className="text-2xl font-extrabold tracking-tight">Find a companion</h1>

      <Card className="mt-4">
        <FieldGroup>
          <Label htmlFor="start" required>From</Label>
          <Input id="start" value={startLabel} onChange={(e) => setStartLabel(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="end" required>To</Label>
          <Input id="end" value={endLabel} onChange={(e) => setEndLabel(e.target.value)} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FieldGroup>
        </div>
        <FieldGroup>
          <Label htmlFor="radius" hint="How far you'd walk to meet someone">
            Pickup radius (km)
          </Label>
          <Select
            id="radius"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
          >
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n} km
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="modes">Transport preference (optional)</Label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <Checkbox
                key={m}
                id={`mode-${m}`}
                label={m[0].toUpperCase() + m.slice(1)}
                checked={modePref.includes(m)}
                onChange={() => toggleMode(m)}
              />
            ))}
          </div>
        </FieldGroup>
        <div className="flex gap-2">
          <Button onClick={() => setSearched(true)} block>
            Search
          </Button>
          <Button variant="outline" onClick={presetFromBooking}>
            Try Coburg → CBD
          </Button>
        </div>
      </Card>

      {searched && (
        <section className="mt-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {results.length} possible companion{results.length === 1 ? "" : "s"}
          </h2>
          <p className="text-xs text-ink/60 dark:text-teal-100/60 mb-3">
            Sorted by route overlap, time proximity, rating, and how well their comfort
            areas match your profile.
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <Card key={r.trip.id}>
                <div className="flex items-start gap-3">
                  <Avatar seed={r.companion.id} label={r.companion.name} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{r.companion.name}</span>
                      <StarRating
                        value={r.companion.rating}
                        count={r.companion.ratingCount}
                      />
                      <Badge tone="success" className="ml-auto">
                        <ShieldCheck className="h-3 w-3" aria-hidden /> Verified
                      </Badge>
                    </div>
                    <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1 line-clamp-2">
                      {r.companion.bio}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-teal-600 dark:text-amber-300">
                    {r.score}%
                  </span>
                  <span className="text-xs text-ink/70 dark:text-teal-100/70 font-semibold uppercase">
                    match
                  </span>
                  <span className="ml-auto text-lg font-bold">${r.trip.fee}</span>
                </div>

                <ul className="mt-3 grid gap-1 text-sm text-ink/85 dark:text-teal-100/85">
                  {r.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-teal-500 dark:text-amber-300 mt-0.5 flex-shrink-0" aria-hidden />
                      {reason}
                    </li>
                  ))}
                </ul>

                <div className="mt-3">
                  <RouteDiagram
                    start={r.trip.start}
                    end={r.trip.end}
                    mode={r.trip.mode}
                  />
                </div>

                <div className="mt-3 text-sm font-semibold text-ink/80 dark:text-teal-100/80">
                  Departs {formatWhen(r.trip.departAt)}
                </div>

                {r.compatibility.unmetAreas.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-sm">
                    <strong>Heads up:</strong> they haven't ticked{" "}
                    {r.compatibility.unmetAreas.join(", ")}. Worth a quick chat first.
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => book(r)} block>
                    Request to join <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </Card>
            ))}
            {results.length === 0 && (
              <Card>
                <p>No matches yet. Try widening your pickup radius or relaxing your transport preference.</p>
              </Card>
            )}
          </div>
        </section>
      )}
    </AppFrame>
  );
}
