import { NextRequest } from "next/server";
import { AuditAction, CaseNoteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.approveCaseNote(user))
      return fail(403, "Only team leads or admins can approve");

    const note = await prisma.caseNote.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
    });
    if (!note) return fail(404, "Not found");
    if (note.status === CaseNoteStatus.APPROVED) return ok({ ok: true });

    await prisma.caseNote.update({
      where: { id: note.id },
      data: {
        status: CaseNoteStatus.APPROVED,
        approverId: user.id,
        approvedAt: new Date(),
      },
    });

    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.APPROVED,
      entityType: "CaseNote",
      entityId: note.id,
    });

    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
