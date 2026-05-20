"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { questions as allQuestions, intake } from "@/lib/questions";
import type { InputMethod } from "@/lib/types";
import { countWords } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { QuestionCard, type AnswerState } from "@/components/QuestionCard";
import { WaveDots } from "@/components/WaveDots";

export interface InitialAnswer {
  input_method: InputMethod;
  transcript: string;
  raw_audio_url: string | null;
}

const HEARTBEAT_MS = 30_000;
const DEBOUNCE_MS = 1_500;

function buildInitialState(
  initial: Record<string, InitialAnswer>
): Record<string, AnswerState> {
  const state: Record<string, AnswerState> = {};
  for (const q of allQuestions) {
    const a = initial[q.id];
    state[q.id] = {
      input_method: a?.input_method ?? "text",
      transcript: a?.transcript ?? "",
      raw_audio_url: a?.raw_audio_url ?? null,
      wordCount: countWords(a?.transcript ?? ""),
    };
  }
  return state;
}

function isAnswered(q: { min_words: number }, a: AnswerState): boolean {
  if (!a.transcript || a.wordCount === 0) return false;
  if (a.input_method === "voice") return true;
  return a.wordCount >= q.min_words;
}

export function IntakeForm({
  token,
  clientName,
  initialAnswers,
}: {
  token: string;
  clientName: string | null;
  initialAnswers: Record<string, InitialAnswer>;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    buildInitialState(initialAnswers)
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [incomplete, setIncomplete] = useState<Set<string>>(new Set());

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const dirtyRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const setSaving = useCallback((id: string, on: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const saveResponse = useCallback(
    async (questionId: string) => {
      const a = answersRef.current[questionId];
      if (!a) return;
      dirtyRef.current.delete(questionId);
      setSaving(questionId, true);
      try {
        await fetch(`/api/intake/${token}/save-response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            input_method: a.input_method,
            transcript: a.transcript,
            raw_audio_url: a.raw_audio_url,
          }),
        });
      } catch {
        // Re-mark dirty so the heartbeat retries.
        dirtyRef.current.add(questionId);
      } finally {
        setSaving(questionId, false);
      }
    },
    [setSaving, token]
  );

  const scheduleSave = useCallback(
    (questionId: string) => {
      dirtyRef.current.add(questionId);
      if (timersRef.current[questionId]) {
        clearTimeout(timersRef.current[questionId]);
      }
      timersRef.current[questionId] = setTimeout(() => {
        void saveResponse(questionId);
      }, DEBOUNCE_MS);
    },
    [saveResponse]
  );

  // 30s heartbeat: flush anything still dirty.
  useEffect(() => {
    const interval = setInterval(() => {
      for (const id of Array.from(dirtyRef.current)) {
        void saveResponse(id);
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [saveResponse]);

  // Best-effort save on tab close.
  useEffect(() => {
    const handler = () => {
      for (const id of Array.from(dirtyRef.current)) {
        const a = answersRef.current[id];
        if (!a) continue;
        const body = JSON.stringify({
          question_id: id,
          input_method: a.input_method,
          transcript: a.transcript,
          raw_audio_url: a.raw_audio_url,
        });
        navigator.sendBeacon?.(
          `/api/intake/${token}/save-response`,
          new Blob([body], { type: "application/json" })
        );
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [token]);

  const handleTranscriptChange = useCallback(
    (questionId: string, text: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          transcript: text,
          wordCount: countWords(text),
        },
      }));
      setIncomplete((prev) => {
        if (!prev.has(questionId)) return prev;
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      scheduleSave(questionId);
    },
    [scheduleSave]
  );

  const handleMethodChange = useCallback(
    (questionId: string, method: InputMethod) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], input_method: method },
      }));
      scheduleSave(questionId);
    },
    [scheduleSave]
  );

  const handleTranscribe = useCallback(
    async (questionId: string, blob: Blob, mimeType: string) => {
      const fd = new FormData();
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      fd.append("audio", blob, `recording.${ext}`);
      fd.append("question_id", questionId);

      const res = await fetch(`/api/intake/${token}/transcribe`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        throw new Error("Transcription failed");
      }
      const data: { transcript: string; raw_audio_url: string | null } =
        await res.json();

      setAnswers((prev) => {
        const existing = prev[questionId];
        const merged = existing.transcript
          ? `${existing.transcript}\n\n${data.transcript}`.trim()
          : data.transcript;
        return {
          ...prev,
          [questionId]: {
            ...existing,
            input_method: "voice",
            transcript: merged,
            raw_audio_url: data.raw_audio_url,
            wordCount: countWords(merged),
          },
        };
      });
      scheduleSave(questionId);
    },
    [scheduleSave, token]
  );

  const completedFlags = useMemo(
    () => allQuestions.map((q) => isAnswered(q, answers[q.id])),
    [answers]
  );
  const allComplete = completedFlags.every(Boolean);

  async function handleSubmit() {
    setSubmitState("submitting");
    setSubmitError(null);

    // Flush any pending saves first.
    for (const id of Array.from(dirtyRef.current)) {
      if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
      await saveResponse(id);
    }

    try {
      const res = await fetch(`/api/intake/${token}/submit`, {
        method: "POST",
      });
      if (res.ok) {
        setSubmitState("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && Array.isArray(data.incomplete)) {
        const ids = new Set<string>(
          data.incomplete.map((x: { question_id: string }) => x.question_id)
        );
        setIncomplete(ids);
        setSubmitState("idle");
        setSubmitError(
          "A few questions still need a little more — they're marked below."
        );
        const firstId = data.incomplete[0]?.question_id;
        if (firstId) {
          document
            .getElementById(firstId)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      setSubmitState("error");
      setSubmitError(
        data.error || "Something went wrong submitting. Please try again."
      );
    } catch {
      setSubmitState("error");
      setSubmitError("Network error. Please try again.");
    }
  }

  if (submitState === "done") {
    return <Confirmation clientName={clientName} />;
  }

  const firstName = clientName?.split(" ")[0] || "there";

  return (
    <main className="content-z mx-auto max-w-prose px-5 pb-32 pt-10 sm:px-6">
      {/* Header */}
      <header className="relative mb-12">
        <WaveDots className="absolute -top-6 right-0 w-24 opacity-50 sm:-top-4 sm:w-32" />
        <p className="font-display text-sm uppercase tracking-[0.18em] text-clay">
          The Clarity Hub
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-charcoal sm:text-5xl">
          {intake.title}
        </h1>
        <p className="mt-4 text-base text-charcoal">
          Hi {firstName} — {intake.intro}
        </p>
        <p className="mt-2 text-sm italic text-[var(--muted)]">
          About {intake.estimated_minutes} minutes. Saves as you go.
        </p>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-0 z-10 -mx-5 mb-8 border-b border-[rgba(46,46,46,0.08)] bg-warm-white/85 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <ProgressDots total={allQuestions.length} completed={completedFlags} />
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-6">
        {allQuestions.map((q, i) => (
          <div
            key={q.id}
            className={
              incomplete.has(q.id)
                ? "rounded-xl ring-2 ring-clay/40 ring-offset-2 ring-offset-warm-white"
                : undefined
            }
          >
            <QuestionCard
              question={q}
              index={i}
              answer={answers[q.id]}
              answered={completedFlags[i]}
              saving={savingIds.has(q.id)}
              onMethodChange={(m) => handleMethodChange(q.id, m)}
              onTranscriptChange={(t) => handleTranscriptChange(q.id, t)}
              onTranscribe={(blob, mime) => handleTranscribe(q.id, blob, mime)}
              disabled={submitState === "submitting"}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        {submitError && (
          <p className="text-sm text-clay">{submitError}</p>
        )}
        {!allComplete && (
          <p className="text-sm text-[var(--muted)]">
            Answer all {allQuestions.length} questions to submit.
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allComplete || submitState === "submitting"}
          className="px-10"
        >
          {submitState === "submitting" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending&hellip;
            </>
          ) : (
            <>
              Submit my intake
              <ArrowRight size={16} />
            </>
          )}
        </Button>
        <p className="max-w-sm text-xs italic text-[var(--muted)]">
          Once you submit, Heather gets to work on your pre-audit summary.
        </p>
      </div>
    </main>
  );
}

function Confirmation({ clientName }: { clientName: string | null }) {
  const firstName = clientName?.split(" ")[0] || "there";
  return (
    <main className="content-z mx-auto flex min-h-screen max-w-prose flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative w-full max-w-md">
        <WaveDots className="absolute -top-24 left-1/2 w-40 -translate-x-1/2 opacity-60" />
      </div>
      <p className="font-display text-sm uppercase tracking-[0.18em] text-clay">
        The Clarity Hub
      </p>
      <h1 className="font-display mt-4 text-4xl leading-tight text-charcoal sm:text-5xl">
        Thank you, <em className="italic text-clay">{firstName}</em>.
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal">
        That&rsquo;s everything I need. Heather will be in touch within 24 hours
        with your pre-audit summary — a first look at what she&rsquo;s already
        noticing about your business.
      </p>
      <p className="mt-6 text-sm italic text-[var(--muted)]">
        Keep an eye on your inbox. See you on the call.
      </p>
    </main>
  );
}
