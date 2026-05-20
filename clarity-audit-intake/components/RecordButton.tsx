"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RecState = "idle" | "recording" | "processing";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function RecordButton({
  onComplete,
  disabled,
}: {
  onComplete: (blob: Blob, mimeType: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Recording isn't supported in this browser. Try typing instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setState("processing");
        try {
          await onComplete(blob, type);
        } catch {
          setError("Something went wrong transcribing that. Try again?");
        } finally {
          setState("idle");
          setSeconds(0);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(
        "Microphone access was blocked. Allow it in your browser, or type your answer."
      );
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {state === "idle" && (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-full border border-clay px-5 py-2.5 text-sm font-medium text-clay transition-colors",
              "hover:bg-clay hover:text-warm-white disabled:opacity-50"
            )}
          >
            <Mic size={16} />
            Start recording
          </button>
        )}

        {state === "recording" && (
          <button
            type="button"
            onClick={stop}
            className="relative inline-flex items-center gap-2.5 rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-warm-white"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-warm-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warm-white" />
            </span>
            <Square size={14} />
            Stop · {mmss}
          </button>
        )}

        {state === "processing" && (
          <span className="inline-flex items-center gap-2.5 rounded-full border border-sage px-5 py-2.5 text-sm font-medium text-navy">
            <Loader2 size={16} className="animate-spin" />
            Transcribing&hellip;
          </span>
        )}
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
