"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseNoteStatus } from "@prisma/client";

interface NoteData {
  id: string;
  status: CaseNoteStatus;
  occurredAt: string;
  createdAt: string;
  approvedAt: string | null;
  author: string;
  approver: string | null;
  participant: {
    id: string;
    name: string;
    goals: { id: string; title: string; isActive: boolean }[];
  };
  goalIds: string[];
  goalTitles: string[];
  supportDelivered: string;
  participantResponse: string;
  risksIncidents: string;
  medicationPrompted: string;
  progressTowardGoals: string;
  nextSteps: string;
  structuredOutput: string;
  versions: { id: string; editedBy: string; createdAt: string }[];
}

export default function CaseNoteReview({
  note,
  canApprove,
  canEdit,
  session,
}: {
  note: NoteData;
  canApprove: boolean;
  canEdit: boolean;
  session: { role: string; name: string };
}) {
  const [editing, setEditing] = useState(false);
  const [structured, setStructured] = useState(note.structuredOutput);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLocal, setStatusLocal] = useState(note.status);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/case-notes/${note.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ structuredOutput: structured }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setEditing(false);
      // Soft reload to refresh versions list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/case-notes/${note.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Approve failed");
      }
      setStatusLocal(CaseNoteStatus.APPROVED);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Case note</h1>
          <div className="text-sm text-ink-500 mt-1">
            <Link
              href={`/participants/${note.participant.id}`}
              className="hover:text-brand-700"
            >
              {note.participant.name}
            </Link>{" "}
            · {new Date(note.occurredAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={statusLocal === "APPROVED" ? "tag" : "tag-warn"}>
            {statusLocal === "APPROVED" ? "Approved" : "Draft"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Original input</h2>
          <Plain label="Support delivered" value={note.supportDelivered} />
          <Plain
            label="Participant response"
            value={note.participantResponse}
          />
          <Plain
            label="Risks / incidents"
            value={note.risksIncidents || "—"}
          />
          <Plain
            label="Medications (prompted/observed)"
            value={note.medicationPrompted || "—"}
          />
          <Plain
            label="Progress toward goals"
            value={note.progressTowardGoals || "—"}
          />
          <Plain label="Next steps" value={note.nextSteps || "—"} />
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">
              Goals addressed
            </div>
            {note.goalTitles.length === 0 ? (
              <span className="text-sm text-ink-500">None</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {note.goalTitles.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">AI-structured (DAP)</h2>
            {canEdit && !editing && (
              <button
                className="btn-outline"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )}
          </div>
          {editing ? (
            <>
              <textarea
                className="input min-h-[420px] font-mono text-sm"
                value={structured}
                onChange={(e) => setStructured(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setStructured(note.structuredOutput);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  disabled={busy}
                  onClick={save}
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-ink-800 font-sans">
              {note.structuredOutput || (
                <span className="text-ink-500">No structured version yet.</span>
              )}
            </pre>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Audit trail</h3>
        <ul className="text-sm text-ink-700 space-y-1">
          <li>
            Created by <b>{note.author}</b> on{" "}
            {new Date(note.createdAt).toLocaleString()}
          </li>
          {note.approvedAt && note.approver && (
            <li>
              Approved by <b>{note.approver}</b> on{" "}
              {new Date(note.approvedAt).toLocaleString()}
            </li>
          )}
          {note.versions.map((v) => (
            <li key={v.id}>
              Edited by <b>{v.editedBy}</b> on{" "}
              {new Date(v.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>

      {statusLocal === "DRAFT" && canApprove && (
        <div className="flex justify-end gap-2">
          <button
            className="btn-primary"
            disabled={busy || editing}
            onClick={approve}
          >
            {busy ? "Approving…" : "Approve note"}
          </button>
        </div>
      )}
    </div>
  );
}

function Plain({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">
        {label}
      </div>
      <div className="text-sm text-ink-800 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
