"use client";

import { useStore } from "@/lib/store";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

export function ToastStack() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(420px,calc(100vw-2rem))]"
    >
      {toasts.map((t) => {
        const Icon =
          t.tone === "success" ? CheckCircle2 : t.tone === "warn" ? AlertTriangle : Info;
        const tone =
          t.tone === "success"
            ? "bg-emerald-600 text-white"
            : t.tone === "warn"
            ? "bg-coral text-white"
            : "bg-ink text-teal-50";
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 shadow-card ${tone}`}
          >
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden />
            <p className="flex-1 text-sm font-semibold leading-snug">{t.text}</p>
            <button
              aria-label="Dismiss notification"
              className="opacity-80 hover:opacity-100"
              onClick={() => dismissToast(t.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
