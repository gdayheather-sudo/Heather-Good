"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  count,
  size = 16,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold">
      <Star
        className="fill-amber-400 text-amber-400"
        style={{ width: size, height: size }}
        aria-hidden
      />
      {value.toFixed(1)}
      {count !== undefined && (
        <span className="text-ink/50 dark:text-teal-100/50 font-medium">
          ({count})
        </span>
      )}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div role="radiogroup" aria-label="Star rating" className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n)}
            className="p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Star
              style={{ width: size, height: size }}
              className={filled ? "fill-amber-400 text-amber-400" : "text-ink/30"}
            />
          </button>
        );
      })}
    </div>
  );
}
