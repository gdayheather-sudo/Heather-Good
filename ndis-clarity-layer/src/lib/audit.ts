import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./db";

export interface AuditInput {
  organisationId: string;
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditEvent.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    // Audit must never break the main path — surface to logs only.
    console.error("[audit] failed to write event", err);
  }
}
