import { AccessibilityProfile, LatLng, SupportArea, Trip, User } from "./types";

const R = 6371; // km
function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function routeKm(t: Trip): number {
  return haversine(t.start, t.end);
}

// Best-effort profile compatibility scoring (0-1) — used so the UI can
// explain *why* a companion is a good match.
const NEEDS_TO_AREA: Record<string, SupportArea[]> = {
  wheelchair: ["wheelchair-assist"],
  "walking-aid": ["wheelchair-assist"],
  vision: ["vision-guide"],
  hearing: ["hearing-support"],
  aac: ["aac-comfortable"],
};

export interface CompatibilityBreakdown {
  score: number; // 0-1
  matchedAreas: SupportArea[];
  unmetAreas: SupportArea[];
}

export function profileCompatibility(
  profile: AccessibilityProfile | undefined,
  comfort: SupportArea[] | undefined
): CompatibilityBreakdown {
  if (!profile || !comfort) return { score: 1, matchedAreas: [], unmetAreas: [] };
  const required = new Set<SupportArea>();
  (NEEDS_TO_AREA[profile.mobility] ?? []).forEach((a) => required.add(a));
  profile.sensory
    .flatMap((s) => NEEDS_TO_AREA[s] ?? [])
    .forEach((a) => required.add(a));
  if (profile.communicationStyle === "aac")
    (NEEDS_TO_AREA["aac"] ?? []).forEach((a) => required.add(a));
  if (
    /anx|overwhelm|crowd|loud/i.test(
      profile.anxietyTriggers + " " + profile.cognitiveSupport
    )
  ) {
    required.add("anxiety-aware");
  }

  if (required.size === 0) return { score: 1, matchedAreas: [], unmetAreas: [] };
  const matched: SupportArea[] = [];
  const unmet: SupportArea[] = [];
  required.forEach((r) => {
    if (comfort.includes(r)) matched.push(r);
    else unmet.push(r);
  });
  return {
    score: matched.length / required.size,
    matchedAreas: matched,
    unmetAreas: unmet,
  };
}

export interface MatchQuery {
  start: LatLng;
  end: LatLng;
  whenIso: string; // requester's preferred datetime
  radiusKm?: number; // default 2km
  modePreference?: Trip["mode"][]; // empty = any
  profile?: AccessibilityProfile;
}

export interface MatchResult {
  trip: Trip;
  companion: User;
  score: number; // 0-100
  startDistanceKm: number;
  endDistanceKm: number;
  routeOverlapKm: number;
  timeDiffMinutes: number;
  reasons: string[];
  compatibility: CompatibilityBreakdown;
}

export function findMatches(
  query: MatchQuery,
  trips: Trip[],
  users: User[]
): MatchResult[] {
  const radius = query.radiusKm ?? 2;
  const requesterRouteKm = haversine(query.start, query.end);
  const whenMs = new Date(query.whenIso).getTime();

  return trips
    .filter((t) => t.status === "open")
    .map((trip) => {
      const startD = haversine(query.start, trip.start);
      const endD = haversine(query.end, trip.end);
      const companion = users.find((u) => u.id === trip.companionId)!;
      const timeDiff = Math.abs(
        new Date(trip.departAt).getTime() - whenMs
      ) / 60000;

      // Heuristic route overlap: the smaller of the two routes minus
      // mismatch penalty from start/end offsets.
      const overlap = Math.max(
        0,
        Math.min(routeKm(trip), requesterRouteKm) - (startD + endD) / 2
      );

      const inRadius = startD <= radius && endD <= radius;
      const modeOk =
        !query.modePreference?.length || query.modePreference.includes(trip.mode);

      const compat = profileCompatibility(query.profile, companion.comfortAreas);

      // Component sub-scores (each 0-1).
      const proximityScore = inRadius
        ? 1 - Math.min(1, (startD + endD) / (2 * radius)) * 0.4
        : 0.2; // gentle fall-off if out of radius
      const timeScore =
        timeDiff < 5 ? 1 : timeDiff < 15 ? 0.9 : timeDiff < 30 ? 0.75 : timeDiff < 60 ? 0.55 : 0.3;
      const ratingScore = companion.rating / 5;
      const compatScore = compat.score;

      const score =
        Math.round(
          (proximityScore * 0.35 +
            timeScore * 0.25 +
            ratingScore * 0.15 +
            compatScore * 0.25) *
            100
        ) * (modeOk ? 1 : 0.6);

      const reasons: string[] = [];
      if (overlap > 0)
        reasons.push(`Route overlaps ~${overlap.toFixed(1)}km with yours`);
      if (timeDiff < 15)
        reasons.push(`Leaves ${Math.round(timeDiff)} min from your preferred time`);
      else
        reasons.push(`Leaves ${Math.round(timeDiff)} min from your preferred time`);
      if (inRadius) reasons.push("Within your pickup radius");
      else reasons.push("Slightly outside your radius — still a possibility");
      if (compat.matchedAreas.length)
        reasons.push(
          `Comfort match: ${compat.matchedAreas.length}/${
            compat.matchedAreas.length + compat.unmetAreas.length
          } of your support needs`
        );

      return {
        trip,
        companion,
        score: Math.round(score),
        startDistanceKm: startD,
        endDistanceKm: endD,
        routeOverlapKm: overlap,
        timeDiffMinutes: timeDiff,
        reasons,
        compatibility: compat,
      };
    })
    .sort((a, b) => b.score - a.score);
}
