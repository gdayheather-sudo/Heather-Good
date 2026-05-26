import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "teal" | "amber" | "coral" | "neutral" | "success";

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-800 dark:text-teal-50",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200",
    coral: "bg-coral/10 text-coral-dark dark:bg-coral/20 dark:text-coral",
    neutral:
      "bg-ink/5 text-ink dark:bg-white/5 dark:text-teal-50",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...rest}
    />
  );
}
