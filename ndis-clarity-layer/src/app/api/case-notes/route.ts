import { NextRequest } from "next/server";
import { z } from "zod";
import { AuditAction, CaseNoteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  participantId: z.string().min(1),
  occurredAt: z.string().optional(),
  goalIds: z.array(z.string()).optional().default([]),
  supportDelivered: z.string().min(1, "Required"),
  participantResponse: z.string().min(1, "Required"),
  risksIncidents: z.string().optional().default(""),
  medicationPrompted: z.string().optional().default(""),
  progressTowardGoals: z.string().optional().default(""),
  nextSteps: z.string().optional().default(""),
  structuredOutput: z.string().optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.viewParticipantsList(user)) return fail(403, "Forbidden");
    const sp = req.nextUrl.searchParams;
    const participantId = sp.get("participantId") || undefined;
    const status = sp.get("status") as CaseNoteStatus | null;

    const notes = await prisma.caseNote.findMany({
      where: {
        organisationId: user.organisationId,
        ...(participantId ? { participantId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
      include: {
        participant: { select: { preferredName: true, fullName: true } },
        author: { select: { fullName: true } },
        approver: { select: { fullName: true } },
      },
    });
    return ok({ notes });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.createCaseNote(user)) return fail(403, "Forbidden");

    const data = Body.parse(await req.json());

    const participant = await prisma.participant.findFirst({
      where: { id: data.participantId, organisationId: user.organisationId },
      select: { id: true },
    });
    if (!participant) return fail(404, "Participant not found");

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.caseNote.create({
        data: {
          organisationId: user.organisationId,
          participantId: participant.id,
          authorId: user.id,
          occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
          status: CaseNoteStatus.DRAFT,
          supportDelivered: data.supportDelivered,
          participantResponse: data.participantResponse,
          risksIncidents: data.risksIncidents || null,
          medicationPrompted: data.medicationPrompted || null,
          progressTowardGoals: data.progressTowardGoals || null,
          nextSteps: data.nextSteps || null,
          structuredOutput: data.structuredOutput || null,
        },
      });
      if (data.goalIds.length) {
        // Validate goals belong to participant
        const validGoals = await tx.participantGoal.findMany({
          where: { id: { in: data.goalIds }, participantId: participant.id },
          select: { id: true },
        });
        if (validGoals.length) {
          await tx.caseNoteGoal.createMany({
            data: validGoals.map((g) => ({
              caseNoteId: created.id,
              goalId: g.id,
            })),
          });
        }
      }
      return created;
    });

    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.CREATED,
      entityType: "CaseNote",
      entityId: note.id,
    });

    return ok({ id: note.id });
  } catch (e) {
    return handleError(e);
  }
}
