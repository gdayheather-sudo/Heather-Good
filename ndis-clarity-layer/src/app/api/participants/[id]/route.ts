import { NextRequest } from "next/server";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import {
  ParticipantInputSchema,
  buildEncryptedFields,
  decryptParticipant,
} from "@/lib/participants";
import { recordAudit } from "@/lib/audit";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    const p = await prisma.participant.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
      include: { goals: true },
    });
    if (!p) return fail(404, "Not found");

    // Quick view: basic info + active goals only
    if (!can.viewParticipantFull(user)) {
      return ok({
        view: "quick",
        participant: {
          id: p.id,
          fullName: p.fullName,
          preferredName: p.preferredName,
          dateOfBirth: p.dateOfBirth,
          goals: p.goals
            .filter((g) => g.isActive)
            .map((g) => ({ id: g.id, title: g.title, tags: g.tags })),
        },
      });
    }

    const decrypted = decryptParticipant(p);
    return ok({
      view: "full",
      participant: {
        id: p.id,
        fullName: p.fullName,
        preferredName: p.preferredName,
        dateOfBirth: p.dateOfBirth,
        goals: p.goals,
        ...decrypted,
        shareWithFamily: p.shareWithFamily,
        shareWithCoordinator: p.shareWithCoordinator,
        consentNotes: p.consentNotes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
    });
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
    if (!can.editParticipant(user)) return fail(403, "Forbidden");

    const existing = await prisma.participant.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
    });
    if (!existing) return fail(404, "Not found");

    const data = ParticipantInputSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.participant.update({
        where: { id: existing.id },
        data: {
          fullName: data.fullName,
          preferredName: data.preferredName || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          shareWithFamily: data.shareWithFamily,
          shareWithCoordinator: data.shareWithCoordinator,
          consentNotes: data.consentNotes || null,
          ...(buildEncryptedFields(data) as any),
        },
      });
      // Replace goals — simpler than diffing for MVP
      await tx.participantGoal.deleteMany({
        where: { participantId: existing.id },
      });
      if (data.goals?.length) {
        await tx.participantGoal.createMany({
          data: data.goals.map((g) => ({
            participantId: existing.id,
            title: g.title,
            description: g.description || null,
            tags: g.tags,
            isActive: g.isActive,
          })),
        });
      }
    });

    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.UPDATED,
      entityType: "Participant",
      entityId: existing.id,
    });

    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
