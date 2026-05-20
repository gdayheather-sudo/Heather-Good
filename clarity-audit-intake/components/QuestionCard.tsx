"use client";

import { Mic, Keyboard } from "lucide-react";
import type { IntakeQuestion } from "@/lib/questions";
import type { InputMethod } from "@/lib/types";
import { RecordButton } from "@/components/RecordButton";
import { TranscriptEditor } from "@/components/TranscriptEditor";
import { cn } from "@/lib/utils";

export interface AnswerState {
  input_method: InputMethod;
  transcript: string;
  raw_audio_url: string | null;
  wordCount: number;
}

export function QuestionCard({
  question,
  index,
  answer,
  answered,
  saving,
  onMethodChange,
  onTranscriptChange,
  onTranscribe,
  disabled,
}: {
  question: IntakeQuestion;
  index: number;
  answer: AnswerState;
  answered: boolean;
  saving: boolean;
  onMethodChange: (m: InputMethod) => void;
  onTranscriptChange: (text: string) => void;
  onTranscribe: (blob: Blob, mimeType: string) => Promise<void>;
  disabled?: boolean;
}) {
  const isVoice = answer.input_method === "voice";

  return (
    <section
      id={question.id}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-paper p-6 transition-colors sm:p-8",
        answered ? "border-sage/50" : "border-[rgba(46,46,46,0.08)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-clay">
            {String(index + 1).padStart(2, "0")} · {question.section}
          </p>
          <h2 className="font-display mt-2 text-2xl leading-snug text-charcoal">
            {question.label}
          </h2>
        </div>
        {answered && (
          <span
            className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sage text-[11px] text-warm-white"
            aria-label="Answered"
          >
            ✓
          </span>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        {question.helper}
      </p>

      {/* Method toggle */}
      <div className="mt-5 inline-flex rounded-full border border-[rgba(46,46,46,0.12)] bg-warm-white/50 p-1">
        <button
          type="button"
          onClick={() => onMethodChange("voice")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            isVoice
              ? "bg-charcoal text-warm-white"
              : "text-[var(--muted)] hover:text-charcoal"
          )}
        >
          <Mic size={13} /> Record
        </button>
        <button
          type="button"
          onClick={() => onMethodChange("text")}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            !isVoice
              ? "bg-charcoal text-warm-white"
              : "text-[var(--muted)] hover:text-charcoal"
          )}
        >
          <Keyboard size={13} /> Type
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {isVoice && (
          <>
            <p className="rounded-md bg-sage/10 px-4 py-3 text-sm italic text-navy">
              &ldquo;{question.voice_prompt}&rdquo;
            </p>
            <RecordButton onComplete={onTranscribe} disabled={disabled} />
            {answer.transcript && (
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                  Transcript · edit if anything came out wrong
                </p>
                <TranscriptEditor
                  value={answer.transcript}
                  onChange={onTranscriptChange}
                  placeholder="Your transcript will appear here…"
                  minWords={question.min_words}
                  wordCount={answer.wordCount}
                  showMinHint={false}
                  disabled={disabled}
                />
              </div>
            )}
          </>
        )}

        {!isVoice && (
          <TranscriptEditor
            value={answer.transcript}
            onChange={onTranscriptChange}
            placeholder="Type your answer here — first instinct is usually best."
            minWords={question.min_words}
            wordCount={answer.wordCount}
            showMinHint
            disabled={disabled}
          />
        )}

        <div className="h-4 text-xs text-[var(--muted)]">
          {saving && <span className="italic">Saving…</span>}
          {!saving && answer.transcript && (
            <span className="italic text-sage">Saved</span>
          )}
        </div>
      </div>
    </section>
  );
}
