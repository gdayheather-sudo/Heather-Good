import { NextRequest } from "next/server";
import { z } from "zod";
import { AuditAction, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.manageUsers(user)) return fail(403, "Forbidden");

    const target = await prisma.user.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
    });
    if (!target) return fail(404, "Not found");

    const data = Body.parse(await req.json());

    // Prevent admins from accidentally locking out the last active admin
    if (
      target.role === Role.ADMIN &&
      ((data.role && data.role !== Role.ADMIN) || data.isActive === false)
    ) {
      const activeAdmins = await prisma.user.count({
        where: {
          organisationId: user.organisationId,
          role: Role.ADMIN,
          isActive: true,
          NOT: { id: target.id },
        },
      });
      if (activeAdmins === 0) {
        return fail(409, "At least one active admin must remain");
      }
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        fullName: data.fullName,
        role: data.role,
        isActive: data.isActive,
        passwordHash: data.password ? await hashPassword(data.password) : undefined,
      },
    });
    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.UPDATED,
      entityType: "User",
      entityId: target.id,
      metadata: { changed: Object.keys(data) },
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
