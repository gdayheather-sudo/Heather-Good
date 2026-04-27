import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issueSession, verifyPassword } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { AuditAction } from "@prisma/client";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { email, password } = Body.parse(json);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.isActive) return fail(401, "Invalid credentials");
    const okPwd = await verifyPassword(password, user.passwordHash);
    if (!okPwd) return fail(401, "Invalid credentials");

    await issueSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organisationId: user.organisationId,
    });
    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "User",
      entityId: user.id,
      ip: req.headers.get("x-forwarded-for"),
    });
    return ok({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (e) {
    return handleError(e);
  }
}
