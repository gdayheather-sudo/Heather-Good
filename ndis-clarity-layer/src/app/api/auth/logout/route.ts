import { clearSession, readSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { ok } from "@/lib/api";
import { AuditAction } from "@prisma/client";

export async function POST() {
  const s = await readSession();
  if (s) {
    await recordAudit({
      organisationId: s.organisationId,
      actorId: s.id,
      action: AuditAction.LOGOUT,
      entityType: "User",
      entityId: s.id,
    });
  }
  clearSession();
  return ok({ ok: true });
}
