export type Role = "companion" | "requester" | "admin";

export type TransportMode = "car" | "train" | "bus" | "tram" | "walking";

export type MobilityNeed =
  | "wheelchair"
  | "walking-aid"
  | "ambulant"
  | "none";

export type SensoryNeed = "vision" | "hearing" | "none";

export type CommunicationStyle = "verbal" | "written" | "aac";

export type SupportArea =
  | "wheelchair-assist"
  | "vision-guide"
  | "hearing-support"
  | "anxiety-aware"
  | "cognitive-support"
  | "aac-comfortable"
  | "first-aid";

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface LatLng {
  lat: number;
  lng: number;
  label: string;
}

export interface AccessibilityProfile {
  mobility: MobilityNeed;
  sensory: SensoryNeed[];
  cognitiveSupport: string;
  anxietyTriggers: string;
  communicationStyle: CommunicationStyle;
}

export interface TrustedContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  photo: string; // emoji or initials seed
  bio: string;
  rating: number; // 0-5
  ratingCount: number;
  region: string;
  verification: {
    wwcc: VerificationStatus;
    wwdc: VerificationStatus;
    photoId: VerificationStatus;
    drivers: VerificationStatus;
  };
  comfortAreas?: SupportArea[]; // companion only
  ndisNumber?: string; // requester only
  accessibility?: AccessibilityProfile; // requester only
  trustedContact?: TrustedContact; // requester only
  reviewTags?: string[];
  joinedAt: string;
}

export type Recurrence =
  | { kind: "one-off" }
  | { kind: "daily" }
  | { kind: "weekly" }
  | { kind: "specific-days"; days: number[] };

export interface Trip {
  id: string;
  companionId: string;
  start: LatLng;
  end: LatLng;
  departAt: string; // ISO
  mode: TransportMode;
  recurrence: Recurrence;
  capacity: number;
  fee: number;
  notes?: string;
  status: "open" | "full" | "in-progress" | "completed" | "cancelled";
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "rated"
  | "cancelled";

export interface Rating {
  by: string; // userId
  stars: number;
  comment?: string;
  tags: string[];
  at: string;
}

export interface Booking {
  id: string;
  tripId: string;
  requesterId: string;
  companionId: string;
  status: BookingStatus;
  pickupOverlapKm: number;
  routeOverlapKm: number;
  matchScore: number;
  paidHeldInEscrow: boolean;
  startedAt?: string;
  endedAt?: string;
  ratings: Rating[];
  flagged?: { by: string; reason: string; at: string };
}

export interface Message {
  id: string;
  bookingId: string;
  fromId: string;
  body: string;
  at: string;
}

export const FEE_CAPS = {
  walking: 5,
  publicTransport: 10,
  carShort: 15,
  carLong: 25,
};

export function feeCap(mode: TransportMode, overlapKm: number): number {
  if (mode === "walking") return FEE_CAPS.walking;
  if (mode === "train" || mode === "bus" || mode === "tram")
    return FEE_CAPS.publicTransport;
  return overlapKm > 10 ? FEE_CAPS.carLong : FEE_CAPS.carShort;
}
