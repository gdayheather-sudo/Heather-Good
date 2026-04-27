import Link from "next/link";
import { CaseNoteStatus } from "@prisma/client";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = (await readSession())!;
  const orgId = session.organisationId;

  const [participants, draftCount, approvedCount, recentNotes, recentReports] =
    await Promise.all([
      prisma.participant.count({ where: { organisationId: orgId } }),
      prisma.caseNote.count({
        where: { organisationId: orgId, status: CaseNoteStatus.DRAFT },
      }),
      prisma.caseNote.count({
        where: { organisationId: orgId, status: CaseNoteStatus.APPROVED },
      }),
      prisma.caseNote.findMany({
        where: { organisationId: orgId },
        orderBy: { occurredAt: "desc" },
        take: 8,
        include: {
          participant: { select: { preferredName: true, fullName: true } },
          author: { select: { fullName: true } },
        },
      }),
      can.generateReport(session)
        ? prisma.report.findMany({
            where: { organisationId: orgId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { participant: { select: { preferredName: true, fullName: true } } },
          })
        : Promise.resolve([] as never[]),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {session.fullName.split(" ")[0]}</h1>
          <p className="text-ink-500 text-sm">A calm overview of today's documentation work.</p>
        </div>
        <div className="flex gap-2">
          {can.createCaseNote(session) && (
            <Link href="/case-notes/new" className="btn-primary">
              New case note
            </Link>
          )}
          {can.generateReport(session) && (
            <Link href="/reports/new" className="btn-outline">
              Generate report
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Participants" value={participants} />
        <Stat label="Notes awaiting approval" value={draftCount} accent={draftCount > 0} />
        <Stat label="Approved notes" value={approvedCount} />
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent case notes</h2>
          <Link href="/case-notes" className="text-sm text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-ink-500">No case notes yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {recentNotes.map((n) => (
              <li key={n.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/case-notes/${n.id}`}
                    className="font-medium text-ink-800 hover:text-brand-700"
                  >
                    {n.participant.preferredName || n.participant.fullName}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {new Date(n.occurredAt).toLocaleString()} · {n.author.fullName}
                  </div>
                </div>
                <span
                  className={
                    n.status === CaseNoteStatus.APPROVED ? "tag" : "tag-warn"
                  }
                >
                  {n.status === CaseNoteStatus.APPROVED ? "Approved" : "Draft"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {can.generateReport(session) && (
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent reports</h2>
            <Link href="/reports" className="text-sm text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <p className="text-sm text-ink-500">No reports generated yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recentReports.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/reports/${r.id}`} className="font-medium hover:text-brand-700">
                      {r.title}
                    </Link>
                    <div className="text-xs text-ink-500">
                      {r.participant.preferredName || r.participant.fullName} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="tag-muted">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink-500">{label}</div>
      <div
        className={
          "mt-1 text-3xl font-semibold " + (accent ? "text-amber-700" : "text-ink-800")
        }
      >
        {value}
      </div>
    </div>
  );
}
