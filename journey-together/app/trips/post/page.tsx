"use client";

import { AppFrame } from "@/components/AppFrame";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Label, Radio, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { useStore } from "@/lib/store";
import { feeCap, Recurrence, TransportMode } from "@/lib/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, Car, Footprints, Info, TramFront, TrainFront } from "lucide-react";

const MODES: { v: TransportMode; label: string; icon: any }[] = [
  { v: "train", label: "Train", icon: TrainFront },
  { v: "tram", label: "Tram", icon: TramFront },
  { v: "bus", label: "Bus", icon: Bus },
  { v: "car", label: "Car", icon: Car },
  { v: "walking", label: "Walking", icon: Footprints },
];

const DAYS = [
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
  { v: 0, label: "Sun" },
];

export default function PostTripPage() {
  const { activeUser, addTrip, pushToast } = useStore();
  const router = useRouter();

  const [startLabel, setStartLabel] = useState(activeUser.region + " Station");
  const [endLabel, setEndLabel] = useState("Southern Cross Station");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [mode, setMode] = useState<TransportMode>("train");
  const [overlapKm, setOverlapKm] = useState(8);
  const [recurKind, setRecurKind] = useState<Recurrence["kind"]>("weekly");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [capacity, setCapacity] = useState(1);
  const [fee, setFee] = useState(8);
  const [notes, setNotes] = useState("");

  const cap = useMemo(() => feeCap(mode, overlapKm), [mode, overlapKm]);

  if (activeUser.role !== "companion") {
    return (
      <AppFrame>
        <Card>
          <p className="font-bold">Only companions can post trips.</p>
          <p className="mt-2 text-sm text-ink/70 dark:text-teal-100/70">
            Switch to a companion account using the picker in the header.
          </p>
        </Card>
      </AppFrame>
    );
  }

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function submit() {
    if (fee > cap) {
      pushToast({ tone: "warn", text: `Fee can't exceed $${cap} for this mode.` });
      return;
    }
    const dt =
      date && time
        ? new Date(`${date}T${time}:00`).toISOString()
        : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const recurrence: Recurrence =
      recurKind === "specific-days" ? { kind: "specific-days", days } : { kind: recurKind } as Recurrence;
    const trip = addTrip({
      companionId: activeUser.id,
      start: { lat: -37.8, lng: 144.95, label: startLabel },
      end: { lat: -37.81, lng: 144.96, label: endLabel },
      departAt: dt,
      mode,
      recurrence,
      capacity,
      fee,
      notes: notes || undefined,
    });
    pushToast({ tone: "success", text: "Trip posted — we'll surface matching requests." });
    router.push(`/trips/${trip.id}`);
  }

  return (
    <AppFrame>
      <h1 className="text-2xl font-extrabold tracking-tight">Offer a journey</h1>
      <p className="text-sm text-ink/70 dark:text-teal-100/70 mt-1">
        Already heading somewhere? Tell us about it — even a regular commute helps.
      </p>

      <div className="mt-5">
        <FieldGroup>
          <Label htmlFor="start" required>Starting from</Label>
          <Input id="start" value={startLabel} onChange={(e) => setStartLabel(e.target.value)} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="end" required>Heading to</Label>
          <Input id="end" value={endLabel} onChange={(e) => setEndLabel(e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="mode">How are you travelling?</Label>
          <div className="grid grid-cols-5 gap-2">
            {MODES.map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                aria-pressed={mode === v}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 font-semibold text-xs ${
                  mode === v
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white dark:bg-ink-soft border-ink/10 dark:border-white/10"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </FieldGroup>

        {mode === "car" && (
          <FieldGroup>
            <Label htmlFor="overlap" hint="Roughly how far you'd share the route">
              Route overlap (km)
            </Label>
            <Input
              id="overlap"
              type="number"
              min={1}
              value={overlapKm}
              onChange={(e) => setOverlapKm(parseInt(e.target.value) || 1)}
            />
          </FieldGroup>
        )}

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
          <Label htmlFor="recur">Recurring?</Label>
          <div className="grid gap-2">
            {(["one-off", "daily", "weekly", "specific-days"] as Recurrence["kind"][]).map(
              (k) => (
                <Radio
                  key={k}
                  name="recur"
                  label={
                    k === "one-off"
                      ? "Just this once"
                      : k === "daily"
                      ? "Every weekday"
                      : k === "weekly"
                      ? "Weekly on this day"
                      : "Specific days of the week"
                  }
                  checked={recurKind === k}
                  onChange={() => setRecurKind(k)}
                />
              )
            )}
          </div>
          {recurKind === "specific-days" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDay(d.v)}
                  aria-pressed={days.includes(d.v)}
                  className={`px-3 py-2 rounded-full font-semibold text-sm border-2 ${
                    days.includes(d.v)
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-white dark:bg-ink-soft border-ink/10 dark:border-white/10"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="capacity">How many people can join?</Label>
          <Select
            id="capacity"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="fee" hint={`Capped at $${cap} for ${mode} trips.`}>
            Thank-you fee
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold">$</span>
            <Input
              id="fee"
              type="number"
              min={0}
              max={cap}
              value={fee}
              onChange={(e) => setFee(parseInt(e.target.value) || 0)}
            />
          </div>
          <p className="mt-2 text-sm text-ink/70 dark:text-teal-100/70 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3 flex gap-2">
            <Info className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" aria-hidden />
            <span>
              This is a thank-you contribution, not a fare. Caps keep this a
              community service.
            </span>
          </p>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="notes" hint="Anything that helps people decide">Notes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. I sit at the front carriage; wheelchair-friendly route."
          />
        </FieldGroup>

        <Button onClick={submit} block size="lg">
          Post this journey
        </Button>
      </div>
    </AppFrame>
  );
}
