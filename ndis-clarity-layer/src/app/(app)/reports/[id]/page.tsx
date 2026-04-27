import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { REPORT_TYPE_LABEL } from "@/lib/reports";
import ReportView from "./ReportView";

export const dynamic = "force-dynamic";

export default async function ReportDetail({
  params,
}: {
  params: { id: string };
}) {
  const session = (await readSession())!;
  if (!can.generateReport(session)) redirect("/dashboard");
  const report = await prisma.report.findFirst({
    where: { id: params.id, organisationId: session.organisationId },
    include: {
      participant: true,
      generatedBy: { select: { fullName: true } },
    },
  });
  if (!report) notFound();

  const metrics = (report.metricsJson || {}) as {
    totalNotes?: number;
    notesPerGoal?: Record<string, number>;
    incidents?: number;
  };

  return (
    <ReportView
      report={{
        id: report.id,
        title: report.title,
        type: REPORT_TYPE_LABEL[report.type],
        status: report.status,
        rangeStart: report.rangeStart.toISOString(),
        rangeEnd: report.rangeEnd.toISOString(),
        narrative: report.narrative || "",
        metrics: {
          totalNotes: metrics.totalNotes ?? 0,
          notesPerGoal: metrics.notesPerGoal ?? {},
          incidents: metrics.incidents ?? 0,
        },
        generatedBy: report.generatedBy.fullName,
        createdAt: report.createdAt.toISOString(),
        shareToken: report.shareToken,
        sharedWithFamily: report.sharedWithFamily,
        sharedWithCoordinator: report.sharedWithCoordinator,
        participant: {
          id: report.participantId,
          name: report.participant.preferredName || report.participant.fullName,
          shareWithFamily: report.participant.shareWithFamily,
          shareWithCoordinator: report.participant.shareWithCoordinator,
        },
      }}
      canShare={can.shareReport(session)}
      appUrl={process.env.APP_URL || ""}
    />
  );
}
