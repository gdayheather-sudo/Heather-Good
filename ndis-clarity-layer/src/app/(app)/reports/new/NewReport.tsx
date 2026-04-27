"use client";

import { useState } from "react";

interface P {
  id: string;
  fullName: string;
  preferredName: string | null;
}

const TYPES = [
  { value: "MONTHLY_SUMMARY", label: "Monthly summary" },
  { value: "PLAN_REVIEW", label: "Plan review report" },
  { value: "ALLIED_HEALTH_UPDATE", label: "Allied health update" },
];

export default function NewReport({ participants }: { participants: P[] }) {
  const today = new Date();
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [participantId, setParticipantId] = useState(participants[0]?.id || "");
  const [type, setType] = useState("MONTHLY_SUMMARY");
  const [rangeStart, setRangeStart] = useState(fmt(oneMonthAgo));
  const [rangeEnd, setRangeEnd] = useState(fmt(today));
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          participantId,
          type,
          rangeStart,
          rangeEnd,
          title: title || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Generation failed");
      }
      const j = await res.json();
      window.location.href = `/reports/${j.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  if (participants.length === 0) {
    return (
      <div className="card p-5 text-sm text-ink-600">
        Add a participant before generating a report.
      </div>
    );
  }

  return (
    <form onSubmit={generate} className="card p-5 space-y-4">
      <div>
        <label className="label">Participant</label>
        <select
          className="input"
          value={participantId}
          onChange={(e) => setParticipantId(e.target.value)}
        >
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.preferredName || p.fullName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Report type</label>
        <select
          className="input"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Period start</label>
          <input
            type="date"
            className="input"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Period end</label>
          <input
            type="date"
            className="input"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="label">Title (optional)</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-generated if left blank"
        />
      </div>
      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Generating…" : "Generate report"}
        </button>
      </div>
    </form>
  );
}
