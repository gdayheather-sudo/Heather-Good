import { LatLng, TransportMode } from "@/lib/types";
import { Bus, Car, Footprints, TramFront, TrainFront } from "lucide-react";

const Icons: Record<TransportMode, typeof Bus> = {
  bus: Bus,
  car: Car,
  tram: TramFront,
  train: TrainFront,
  walking: Footprints,
};

export function RouteDiagram({
  start,
  end,
  mode,
  km,
}: {
  start: LatLng;
  end: LatLng;
  mode: TransportMode;
  km?: number;
}) {
  const Icon = Icons[mode];
  return (
    <div
      role="img"
      aria-label={`${mode} trip from ${start.label} to ${end.label}${
        km ? `, about ${km.toFixed(1)} kilometres` : ""
      }`}
      className="rounded-2xl bg-gradient-to-br from-teal-50 to-amber-50 dark:from-teal-800/60 dark:to-teal-700/40 p-4 border border-ink/5 dark:border-white/5"
    >
      <svg
        viewBox="0 0 320 80"
        className="w-full h-16"
        aria-hidden
        preserveAspectRatio="none"
      >
        <line
          x1="24"
          y1="40"
          x2="296"
          y2="40"
          stroke="currentColor"
          className="text-teal-500/40"
          strokeWidth="4"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        <circle cx="24" cy="40" r="8" className="fill-teal-500" />
        <circle cx="296" cy="40" r="8" className="fill-amber-400" />
      </svg>
      <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          {start.label}
        </span>
        <Icon className="h-4 w-4 mx-1 text-ink/60 dark:text-teal-50/80" aria-hidden />
        <span className="ml-auto flex items-center gap-1.5">
          {end.label}
          <span className="h-2 w-2 rounded-full bg-amber-400" />
        </span>
      </div>
      {km !== undefined && (
        <div className="mt-1 text-xs text-ink/60 dark:text-teal-100/60">
          ≈ {km.toFixed(1)} km · {mode}
        </div>
      )}
    </div>
  );
}
