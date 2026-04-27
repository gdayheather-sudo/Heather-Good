import { NextRequest } from "next/server";
import { z } from "zod";
import {
  AuditAction,
  CaseNoteStatus,
  ReportStatus,
  ReportType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { generateReportNarrative } from "@/lib/ai";
import {
  REPORT_TYPE_LABEL,
  renderReportDocx,
  renderReportPdf,
} from "@/lib/reports";

const Body = z.object({
  participantId: z.string().min(1),
  type: z.nativeEnum(ReportType),
  rangeStart: z.string(),
  rangeEnd: z.string(),
  title: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!can.generateReport(user)) return fail(403, "Forbidden");
    const reports = await prisma.report.findMany({
      where: { organisationId: user.organisationId },
      orderBy: { createdAt: "desc" },
      include: {
        participant: { select: { preferredName: true, fullName: true } },
        generatedBy: { select: { fullName: true } },
      },
    });
    return ok({ reports });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.generateReport(user)) return fail(403, "Only team leads or admins can generate reports");

    const data = Body.parse(await req.json());
    const start = new Date(data.rangeStart);
    const end = new Date(data.rangeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return fail(400, "Invalid date range");
    }

    const participant = await prisma.participant.findFirst({
      where: { id: data.participantId, organisationId: user.organisationId },
      include: { goals: true },
    });
    if (!participant) return fail(404, "Participant not found");

    const notes = await prisma.caseNote.findMany({
      where: {
        organisationId: user.organisationId,
        participantId: participant.id,
        status: CaseNoteStatus.APPROVED,
        occurredAt: { gte: start, lte: new Date(end.getTime() + 86_399_999) },
      },
      include: { goals: { include: { goal: true } } },
      orderBy: { occurredAt: "asc" },
    });

    const goalCount: Record<string, number> = {};
    let incidents = 0;
    for (const n of notes) {
      if (n.risksIncidents && n.risksIncidents.trim().length > 0) incidents++;
      for (const g of n.goals) {
        goalCount[g.goal.title] = (goalCount[g.goal.title] || 0) + 1;
      }
    }

    const title =
      data.title ||
      `${REPORT_TYPE_LABEL[data.type]} — ${participant.preferredName || participant.fullName} (${start.toLocaleDateString()} → ${end.toLocaleDateString()})`;

    const report = await prisma.report.create({
      data: {
        organisationId: user.organisationId,
        participantId: participant.id,
        generatedById: user.id,
        type: data.type,
        status: ReportStatus.GENERATING,
        rangeStart: start,
        rangeEnd: end,
        title,
        metricsJson: { totalNotes: notes.length, notesPerGoal: goalCount, incidents },
      },
    });

    try {
      const narrative = await generateReportNarrative({
        participantName: participant.fullName,
        preferredName: participant.preferredName || participant.fullName,
        reportType: REPORT_TYPE_LABEL[data.type],
        rangeStart: start,
        rangeEnd: end,
        goals: participant.goals
          .filter((g) => g.isActive)
          .map((g) => ({ title: g.title, tags: g.tags })),
        notes: notes.map((n) => ({
          occurredAt: n.occurredAt,
          structured: n.structuredOutput || n.supportDelivered,
          goalTitles: n.goals.map((g) => g.goal.title),
          risks: n.risksIncidents,
        })),
        metrics: { totalNotes: notes.length, notesPerGoal: goalCount, incidents },
      });

      const org = await prisma.organisation.findUnique({
        where: { id: user.organisationId },
      });

      const renderInput = {
        organisation: {
          name: org?.name || "",
          legalName: org?.legalName,
          abn: org?.abn,
          address: org?.address,
          contactEmail: org?.contactEmail,
          contactPhone: org?.contactPhone,
          primaryColor: org?.primaryColor,
        },
        participantName: participant.fullName,
        preferredName: participant.preferredName || participant.fullName,
        type: data.type,
        rangeStart: start,
        rangeEnd: end,
        narrative,
        metrics: { totalNotes: notes.length, notesPerGoal: goalCount, incidents },
        generatedBy: user.fullName,
        generatedAt: new Date(),
      };

      const [pdfPath, docxPath] = await Promise.all([
        renderReportPdf(report.id, renderInput),
        renderReportDocx(report.id, renderInput),
      ]);

      const updated = await prisma.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.READY,
          narrative,
          pdfPath,
          docxPath,
        },
      });

      await prisma.reportVersion.create({
        data: {
          reportId: report.id,
          snapshot: {
            narrative,
            metrics: renderInput.metrics,
            generatedAt: renderInput.generatedAt.toISOString(),
          },
        },
      });

      await recordAudit({
        organisationId: user.organisationId,
        actorId: user.id,
        action: AuditAction.GENERATED,
        entityType: "Report",
        entityId: updated.id,
      });

      return ok({ id: updated.id });
    } catch (err) {
      console.error("[reports] generation failed", err);
      await prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.FAILED },
      });
      return fail(500, "Report generation failed");
    }
  } catch (e) {
    return handleError(e);
  }
}
