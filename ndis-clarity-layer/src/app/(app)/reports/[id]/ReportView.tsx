"use client";

import Link from "next/link";
import { useState } from "react";

interface R {
  id: string;
  title: string;
  type: string;
  status: string;
  rangeStart: string;
  rangeEnd: string;
  narrative: string;
  metrics: {
    totalNotes: number;
    notesPerGoal: Record<string, number>;
    incidents: number;
  };
  generatedBy: string;
  createdAt: string;
  shareToken: string | null;
  sharedWithFamily: boolean;
  sharedWithCoordinator: boolean;
  participant: {
    id: string;
    name: string;
    shareWithFamily: boolean;
    shareWithCoordinator: boolean;
  };
}

export default function ReportView({
  report,
  canShare,
  appUrl,
}: {
  report: R;
  canShare: boolean;
  appUrl: string;
}) {
  const [shareToken, setShareToken] = useState<string | null>(report.shareToken);
  const [shareFamily, setShareFamily] = useState(report.sharedWithFamily);
  const [shareCoord, setShareCoord] = useState(report.sharedWithCoordinator);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = shareToken ? `${appUrl}/shared/${shareToken}` : "";

  async function toggleShare(enable: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enable,
          shareWithFamily: shareFamily,
          shareWithCoordinator: shareCoord,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Share update failed");
      }
      const j = await res.json();
      setShareToken(j.shareToken ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share update failed");
    } finally {
      setBusy(false);
    }
  }

  function emailSummary() {
    const subject = encodeURIComponent(report.title);
    const lines = [
      `${report.title}`,
      "",
      `Period: ${new Date(report.rangeStart).toDateString()} – ${new Date(report.rangeEnd).toDateString()}`,
      `Approved notes in period: ${report.metrics.totalNotes}`,
      `Incidents: ${report.metrics.incidents}`,
      "",
      report.narrative,
    ];
    if (shareUrl) {
      lines.push("", `View report online: ${shareUrl}`);
    }
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{report.title}</h1>
          <div className="text-sm text-ink-500 mt-1">
            {report.type} ·{" "}
            <Link
              href={`/participants/${report.participant.id}`}
              className="hover:text-brand-700"
            >
              {report.participant.name}
            </Link>{" "}
            ·{" "}
            {new Date(report.rangeStart).toDateString()} →{" "}
            {new Date(report.rangeEnd).toDateString()}
          </div>
        </div>
        <span
          className={
            report.status === "READY"
              ? "tag"
              : report.status === "FAILED"
                ? "tag-warn"
                : "tag-muted"
          }
        >
          {report.status}
        </span>
      </div>

      <div className="card p-5 space-y-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Stat label="Approved notes" value={report.metrics.totalNotes} />
          <Stat label="Incidents" value={report.metrics.incidents} />
          <Stat
            label="Goals covered"
            value={Object.keys(report.metrics.notesPerGoal).length}
          />
        </div>
        {Object.keys(report.metrics.notesPerGoal).length > 0 && (
          <div className="text-sm">
            <div className="text-ink-500 mb-1">Notes per goal</div>
            <ul className="text-ink-700">
              {Object.entries(report.metrics.notesPerGoal).map(([g, n]) => (
                <li key={g}>
                  • {g}: {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Narrative</h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-ink-800">
          {report.narrative || "—"}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">Outputs</h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/reports/${report.id}/download?format=pdf`}
            className="btn-outline"
          >
            Download PDF
          </a>
          <a
            href={`/api/reports/${report.id}/download?format=docx`}
            className="btn-outline"
          >
            Download Word (.docx)
          </a>
          <button onClick={emailSummary} className="btn-outline">
            Email summary
          </button>
        </div>
      </div>

      {canShare && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">Sharing</h2>
          <p className="text-sm text-ink-500">
            Sharing creates a read-only link for external viewers. Both the
            participant's profile consent and your toggles below are required.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!report.participant.shareWithFamily}
                checked={shareFamily}
                onChange={(e) => setShareFamily(e.target.checked)}
              />
              Share with family
              {!report.participant.shareWithFamily && (
                <span className="text-xs text-ink-500">
                  (consent not granted)
                </span>
              )}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!report.participant.shareWithCoordinator}
                checked={shareCoord}
                onChange={(e) => setShareCoord(e.target.checked)}
              />
              Share with coordinator
              {!report.participant.shareWithCoordinator && (
                <span className="text-xs text-ink-500">
                  (consent not granted)
                </span>
              )}
            </label>
          </div>

          {shareToken ? (
            <div className="space-y-2">
              <div className="text-sm text-ink-700">Shareable link</div>
              <input className="input" readOnly value={shareUrl} />
              <div className="flex gap-2">
                <button
                  className="btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                >
                  Copy link
                </button>
                <button
                  className="btn-ghost text-red-600"
                  disabled={busy}
                  onClick={() => toggleShare(false)}
                >
                  Revoke share
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-primary"
              disabled={busy || (!shareFamily && !shareCoord)}
              onClick={() => toggleShare(true)}
            >
              {busy ? "Updating…" : "Create share link"}
            </button>
          )}

          {error && (
            <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-ink-500">
        Generated by {report.generatedBy} on{" "}
        {new Date(report.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-ink-50 px-3 py-2">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
