import { NextRequest } from "next/server";
import { z } from "zod";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  name: z.string().min(2),
  legalName: z.string().optional().default(""),
  abn: z.string().optional().default(""),
  address: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex like #2c8a6f")
    .optional()
    .default("#2c8a6f"),
  logoUrl: z.string().optional().default(""),
  letterheadHtml: z.string().optional().default(""),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!can.manageBranding(user)) return fail(403, "Forbidden");
    const org = await prisma.organisation.findUnique({
      where: { id: user.organisationId },
    });
    return ok({ organisation: org });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!can.manageBranding(user)) return fail(403, "Forbidden");
    const data = Body.parse(await req.json());
    const updated = await prisma.organisation.update({
      where: { id: user.organisationId },
      data: {
        name: data.name,
        legalName: data.legalName || null,
        abn: data.abn || null,
        address: data.address || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        primaryColor: data.primaryColor,
        logoUrl: data.logoUrl || null,
        letterheadHtml: data.letterheadHtml || null,
      },
    });
    await recordAudit({
      organisationId: user.organisationId,
      actorId: user.id,
      action: AuditAction.UPDATED,
      entityType: "Organisation",
      entityId: updated.id,
    });
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
