"use client";

import { ReactNode, useState } from "react";
import { Info } from "lucide-react";

export function Tooltip({
  text,
  children,
  label,
}: {
  text: string;
  label?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-200 underline-offset-2 underline decoration-dotted font-semibold"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        aria-label={label ? `What is ${label}?` : "More info"}
        aria-expanded={open}
      >
        {children ?? <Info className="h-4 w-4" />}
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-30 left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl bg-ink text-teal-50 text-sm p-3 shadow-card"
        >
          {text}
        </span>
      )}
    </span>
  );
}
