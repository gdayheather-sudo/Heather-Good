import { NextRequest } from "next/server";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { ParticipantInputSchema, buildEncryptedFields } from "@/lib/participants";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    if (!can.viewParticipantsList(user)) return fail(403, "Forbidden");
    const participants = await prisma.participant.findMany({
      where: { organisationId: user.organisationId },
      orderBy: { fullName: "asc" },
      include: { goals: { where: { isActive: true } } },
    });
    return ok({
      participants: participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        preferredName: p.preferredName,
        dateOfBirth: p.dateOfBirth,
        goals: p.goals.map((g) => ({ id: g.id, title: g.title, tags: g.tags })),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.editParticipant(user)) return fail(403, "Only team leads or admins can create participants");

    const json = await req.json();
    const data = ParticipantInputSchema.parse(json);

    const created = await prisma.$transaction(async (tx) => {
      const p = await tx.participant.create({
        data: {
          organisationId: user.organisationId,
          fullName: data.fullName,
          preferredName: data.preferredName || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          shareWithFamily: data.shareWithFamily,
          shareWithCoordinator: data.shareWithCoordinator,
          consentNotes: data.consentNotes || null,
          ...(buildEncryptedFields(data) as any),
        },
      });
      if (data.goals?.length) {
        await tx.participantGoal.createMany({
          data: data.goals.map((g) => ({
            participantId: p.id,
            title: g.title,
            description: g.description || null,
            tags: g.tags,
            isActive: g.isActive,
          })),
        });
      }
      return p;
    });

    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.CREATED,
      entityType: "Participant",
      entityId: created.id,
    });

    return ok({ id: created.id });
  } catch (e) {
    return handleError(e);
  }
}
