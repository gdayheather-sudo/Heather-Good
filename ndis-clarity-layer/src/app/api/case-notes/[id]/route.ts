import { NextRequest } from "next/server";
import { z } from "zod";
import { AuditAction, CaseNoteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  occurredAt: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  supportDelivered: z.string().min(1).optional(),
  participantResponse: z.string().min(1).optional(),
  risksIncidents: z.string().optional(),
  medicationPrompted: z.string().optional(),
  progressTowardGoals: z.string().optional(),
  nextSteps: z.string().optional(),
  structuredOutput: z.string().optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const note = await prisma.caseNote.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
      include: {
        participant: {
          include: { goals: { where: { isActive: true } } },
        },
        author: { select: { fullName: true } },
        approver: { select: { fullName: true } },
        goals: { include: { goal: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          include: { editedBy: { select: { fullName: true } } },
        },
      },
    });
    if (!note) return fail(404, "Not found");
    return ok({ note });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.createCaseNote(user)) return fail(403, "Forbidden");

    const existing = await prisma.caseNote.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
      include: { goals: true },
    });
    if (!existing) return fail(404, "Not found");
    if (existing.status === CaseNoteStatus.APPROVED) {
      return fail(409, "Approved notes cannot be edited");
    }

    const data = Body.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      // Snapshot current state into version history
      await tx.caseNoteVersion.create({
        data: {
          caseNoteId: existing.id,
          editedById: user.id,
          snapshot: {
            supportDelivered: existing.supportDelivered,
            participantResponse: existing.participantResponse,
            risksIncidents: existing.risksIncidents,
            medicationPrompted: existing.medicationPrompted,
            progressTowardGoals: existing.progressTowardGoals,
            nextSteps: existing.nextSteps,
            structuredOutput: existing.structuredOutput,
            occurredAt: existing.occurredAt.toISOString(),
            goalIds: existing.goals.map((g) => g.goalId),
          },
        },
      });

      await tx.caseNote.update({
        where: { id: existing.id },
        data: {
          occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
          supportDelivered: data.supportDelivered,
          participantResponse: data.participantResponse,
          risksIncidents:
            data.risksIncidents === undefined ? undefined : data.risksIncidents || null,
          medicationPrompted:
            data.medicationPrompted === undefined ? undefined : data.medicationPrompted || null,
          progressTowardGoals:
            data.progressTowardGoals === undefined ? undefined : data.progressTowardGoals || null,
          nextSteps:
            data.nextSteps === undefined ? undefined : data.nextSteps || null,
          structuredOutput:
            data.structuredOutput === undefined ? undefined : data.structuredOutput || null,
        },
      });

      if (data.goalIds) {
        await tx.caseNoteGoal.deleteMany({
          where: { caseNoteId: existing.id },
        });
        if (data.goalIds.length) {
          const valid = await tx.participantGoal.findMany({
            where: {
              id: { in: data.goalIds },
              participantId: existing.participantId,
            },
            select: { id: true },
          });
          if (valid.length) {
            await tx.caseNoteGoal.createMany({
              data: valid.map((g) => ({
                caseNoteId: existing.id,
                goalId: g.id,
              })),
            });
          }
        }
      }
    });

    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.UPDATED,
      entityType: "CaseNote",
      entityId: existing.id,
    });

    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
