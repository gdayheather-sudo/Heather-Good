import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, issueSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { AuditAction, Role } from "@prisma/client";
import { recordAudit } from "@/lib/audit";

// First user of an organisation registers and bootstraps the org as ADMIN.
const Body = z.object({
  organisationName: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10, "Use at least 10 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const data = Body.parse(json);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail(409, "An account with that email already exists");

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: { name: data.organisationName },
      });
      return tx.user.create({
        data: {
          organisationId: org.id,
          email,
          fullName: data.fullName,
          passwordHash,
          role: Role.ADMIN,
        },
      });
    });

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
      action: AuditAction.CREATED,
      entityType: "User",
      entityId: user.id,
      metadata: { bootstrap: true },
    });

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      organisationId: user.organisationId,
    });
  } catch (e) {
    return handleError(e);
  }
}
