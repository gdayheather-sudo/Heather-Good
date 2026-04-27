import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { REPORT_TYPE_LABEL } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = (await readSession())!;
  if (!can.generateReport(session)) redirect("/dashboard");
  const reports = await prisma.report.findMany({
    where: { organisationId: session.organisationId },
    orderBy: { createdAt: "desc" },
    include: {
      participant: { select: { preferredName: true, fullName: true } },
      generatedBy: { select: { fullName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-ink-500 text-sm">
            Generate, download, and (with consent) share NDIS-ready outputs.
          </p>
        </div>
        <Link href="/reports/new" className="btn-primary">
          Generate report
        </Link>
      </div>

      <div className="card divide-y divide-ink-100">
        {reports.length === 0 && (
          <div className="p-8 text-center text-ink-500 text-sm">
            No reports yet.
          </div>
        )}
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/reports/${r.id}`}
            className="block p-4 hover:bg-ink-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {REPORT_TYPE_LABEL[r.type]} ·{" "}
                  {r.participant.preferredName || r.participant.fullName} ·{" "}
                  {r.generatedBy.fullName} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={
                    r.status === "READY"
                      ? "tag"
                      : r.status === "FAILED"
                        ? "tag-warn"
                        : "tag-muted"
                  }
                >
                  {r.status}
                </span>
                {r.shareToken && <span className="tag-muted">Shared</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
