"use client";

import { cn } from "@/lib/utils";

export function TranscriptEditor({
  value,
  onChange,
  placeholder,
  minWords,
  wordCount,
  showMinHint,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  minWords: number;
  wordCount: number;
  showMinHint: boolean;
  disabled?: boolean;
}) {
  const metMin = wordCount >= minWords;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={5}
        className={cn(
          "w-full resize-y rounded-md border border-[rgba(46,46,46,0.15)] bg-warm-white/60 px-4 py-3",
          "font-sans text-[15px] leading-relaxed text-charcoal placeholder:text-[var(--muted)]/70",
          "transition-colors focus:border-sage focus:outline-none focus:ring-2 focus:ring-sage/30",
          "disabled:opacity-60"
        )}
      />
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        {showMinHint && !metMin && (
          <span className="text-clay">
            A little more detail helps — aim for ~{minWords} words.
          </span>
        )}
        {showMinHint && metMin && (
          <span className="text-sage">Looks good.</span>
        )}
      </div>
    </div>
  );
}
