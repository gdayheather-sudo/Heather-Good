"use client";

import { useMemo, useState } from "react";

interface Goal {
  id: string;
  title: string;
  tags: string[];
}
interface Participant {
  id: string;
  fullName: string;
  preferredName: string | null;
  goals: Goal[];
}

export default function NewCaseNote({
  participants,
  defaultParticipantId,
}: {
  participants: Participant[];
  defaultParticipantId?: string;
}) {
  const [participantId, setParticipantId] = useState(
    defaultParticipantId || participants[0]?.id || "",
  );
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [supportDelivered, setSupportDelivered] = useState("");
  const [participantResponse, setParticipantResponse] = useState("");
  const [risksIncidents, setRisksIncidents] = useState("");
  const [medicationPrompted, setMedicationPrompted] = useState("");
  const [progressTowardGoals, setProgressTowardGoals] = useState("");
  const [nextSteps, setNextSteps] = useState("");

  const [structured, setStructured] = useState("");
  const [structuring, setStructuring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedParticipant = useMemo(
    () => participants.find((p) => p.id === participantId),
    [participants, participantId],
  );

  function toggleGoal(id: string) {
    setGoalIds((g) =>
      g.includes(id) ? g.filter((x) => x !== id) : [...g, id],
    );
  }

  async function structure() {
    setError(null);
    setStructuring(true);
    try {
      const res = await fetch("/api/case-notes/structure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          goalIds,
          supportDelivered,
          participantResponse,
          risksIncidents,
          medicationPrompted,
          progressTowardGoals,
          nextSteps,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to structure");
      }
      const j = await res.json();
      setStructured(j.structured || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to structure");
    } finally {
      setStructuring(false);
    }
  }

  async function approveAndSave() {
    setError(null);
    setSaving(true);
    try {
      if (!structured.trim()) {
        throw new Error("Please structure the note before approving");
      }
      const res = await fetch("/api/case-notes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          goalIds,
          supportDelivered,
          participantResponse,
          risksIncidents,
          medicationPrompted,
          progressTowardGoals,
          nextSteps,
          structuredOutput: structured,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      const j = await res.json();
      window.location.href = `/case-notes/${j.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (participants.length === 0) {
    return (
      <div className="card p-5 text-sm text-ink-600">
        You don't have any participants yet. Ask an admin or team lead to add a
        participant first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Participant</label>
            <select
              className="input"
              value={participantId}
              onChange={(e) => {
                setParticipantId(e.target.value);
                setGoalIds([]);
              }}
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preferredName || p.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Goals addressed</label>
            <div className="flex flex-wrap gap-1.5">
              {selectedParticipant?.goals.length === 0 && (
                <span className="text-sm text-ink-500">
                  No active goals on this profile.
                </span>
              )}
              {selectedParticipant?.goals.map((g) => {
                const active = goalIds.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGoal(g.id)}
                    className={
                      active
                        ? "tag cursor-pointer"
                        : "tag-muted cursor-pointer hover:bg-ink-200"
                    }
                  >
                    {g.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your input</h2>
            <span className="tag-muted">Plain words</span>
          </div>
          <Field label="What support was delivered?" required>
            <textarea
              className="input min-h-[80px]"
              value={supportDelivered}
              onChange={(e) => setSupportDelivered(e.target.value)}
            />
          </Field>
          <Field
            label="What did the participant do? (observable only)"
            required
          >
            <textarea
              className="input min-h-[80px]"
              value={participantResponse}
              onChange={(e) => setParticipantResponse(e.target.value)}
            />
          </Field>
          <Field label="Any risks or incidents?">
            <textarea
              className="input min-h-[60px]"
              value={risksIncidents}
              onChange={(e) => setRisksIncidents(e.target.value)}
            />
          </Field>
          <Field label="Were medications prompted/observed?">
            <textarea
              className="input min-h-[60px]"
              value={medicationPrompted}
              onChange={(e) => setMedicationPrompted(e.target.value)}
            />
          </Field>
          <Field label="Progress toward goals">
            <textarea
              className="input min-h-[60px]"
              value={progressTowardGoals}
              onChange={(e) => setProgressTowardGoals(e.target.value)}
            />
          </Field>
          <Field label="Next steps">
            <textarea
              className="input min-h-[60px]"
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
            />
          </Field>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary"
              onClick={structure}
              disabled={
                structuring ||
                !supportDelivered.trim() ||
                !participantResponse.trim()
              }
            >
              {structuring ? "Structuring…" : "Structure note"}
            </button>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">AI-structured (DAP)</h2>
            <span className="tag">Editable</span>
          </div>
          <textarea
            className="input min-h-[420px] font-mono text-sm"
            placeholder="Click 'Structure note' to generate. You can edit before approving."
            value={structured}
            onChange={(e) => setStructured(e.target.value)}
          />
          <p className="text-xs text-ink-500">
            Review the AI output. You are the final author — edit anything that
            isn't accurate, then approve and save as a draft.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <a href="/case-notes" className="btn-ghost">
          Cancel
        </a>
        <button
          type="button"
          className="btn-primary"
          onClick={approveAndSave}
          disabled={saving || !structured.trim()}
        >
          {saving ? "Saving…" : "Approve & save"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
