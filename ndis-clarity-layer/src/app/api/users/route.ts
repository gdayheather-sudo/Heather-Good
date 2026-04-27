import { NextRequest } from "next/server";
import { z } from "zod";
import { AuditAction, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10),
  role: z.nativeEnum(Role),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!can.manageUsers(user)) return fail(403, "Forbidden");
    const users = await prisma.user.findMany({
      where: { organisationId: user.organisationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return ok({ users });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.manageUsers(user)) return fail(403, "Forbidden");
    const data = Body.parse(await req.json());
    const email = data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return fail(409, "Email already in use");

    const created = await prisma.user.create({
      data: {
        organisationId: user.organisationId,
        email,
        fullName: data.fullName,
        role: data.role,
        passwordHash: await hashPassword(data.password),
      },
    });
    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.CREATED,
      entityType: "User",
      entityId: created.id,
      metadata: { role: data.role },
    });
    return ok({ id: created.id });
  } catch (e) {
    return handleError(e);
  }
}
