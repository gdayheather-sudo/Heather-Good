import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  shareWithFamily: z.boolean().optional(),
  shareWithCoordinator: z.boolean().optional(),
  enable: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.shareReport(user)) return fail(403, "Forbidden");
    const data = Body.parse(await req.json());

    const report = await prisma.report.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
      include: { participant: true },
    });
    if (!report) return fail(404, "Not found");

    if (data.enable) {
      const family = data.shareWithFamily ?? false;
      const coord = data.shareWithCoordinator ?? false;
      if (family && !report.participant.shareWithFamily) {
        return fail(
          409,
          "Participant has not consented to sharing with family. Update their profile first.",
        );
      }
      if (coord && !report.participant.shareWithCoordinator) {
        return fail(
          409,
          "Participant has not consented to sharing with coordinator. Update their profile first.",
        );
      }
      const token = report.shareToken || randomBytes(24).toString("base64url");
      const updated = await prisma.report.update({
        where: { id: report.id },
        data: {
          shareToken: token,
          sharedWithFamily: family,
          sharedWithCoordinator: coord,
          sharedAt: new Date(),
        },
      });
      await recordAudit({
        organisationId: user.organisationId,
        actorId: user.id,
        action: AuditAction.SHARED,
        entityType: "Report",
        entityId: report.id,
        metadata: { family, coordinator: coord },
      });
      const base = process.env.APP_URL || "";
      return ok({
        shareToken: updated.shareToken,
        url: `${base}/shared/${updated.shareToken}`,
      });
    } else {
      await prisma.report.update({
        where: { id: report.id },
        data: {
          shareToken: null,
          sharedWithFamily: false,
          sharedWithCoordinator: false,
          sharedAt: null,
        },
      });
      await recordAudit({
        organisationId: user.organisationId,
        actorId: user.id,
        action: AuditAction.UNSHARED,
        entityType: "Report",
        entityId: report.id,
      });
      return ok({ shareToken: null });
    }
  } catch (e) {
    return handleError(e);
  }
}
