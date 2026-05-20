import { cn } from "@/lib/utils";

export function ProgressDots({
  total,
  completed,
}: {
  total: number;
  completed: boolean[];
}) {
  const count = completed.filter(Boolean).length;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-2.5 rounded-full border transition-all duration-500",
              completed[i]
                ? "border-sage bg-sage"
                : "border-[rgba(46,46,46,0.25)] bg-transparent"
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        {count} of {total} answered
      </p>
    </div>
  );
}
