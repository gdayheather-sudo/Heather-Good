import { ShieldCheck, BadgeCheck, IdCard, Car } from "lucide-react";
import { User } from "@/lib/types";
import { Tooltip } from "./ui/Tooltip";

const STATUS_STYLE = {
  verified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  rejected: "bg-coral/10 text-coral-dark dark:bg-coral/20 dark:text-coral",
} as const;

export function VerificationBadges({ user }: { user: User }) {
  const items: { key: keyof User["verification"]; icon: typeof ShieldCheck; label: string; tip: string }[] = [
    {
      key: "wwcc",
      icon: ShieldCheck,
      label: "WWCC",
      tip: "Working With Children Check — a national background check required to work or volunteer with under-18s.",
    },
    {
      key: "wwdc",
      icon: BadgeCheck,
      label: "WWDC",
      tip: "Working With Disability Check (NDIS Worker Screening) — a national check for people in disability work.",
    },
    {
      key: "photoId",
      icon: IdCard,
      label: "Photo ID",
      tip: "Government-issued photo ID has been verified against the live photo on file.",
    },
    {
      key: "drivers",
      icon: Car,
      label: "Driver",
      tip: "Driver's licence verified — required for car trips.",
    },
  ];
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(({ key, icon: Icon, label, tip }) => {
        const status = user.verification[key];
        return (
          <li
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
            <span className="opacity-70">
              {status === "verified" ? "✓" : status === "pending" ? "…" : "✗"}
            </span>
            <Tooltip text={tip} label={label} />
          </li>
        );
      })}
    </ul>
  );
}
