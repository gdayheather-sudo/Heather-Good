import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError, ok } from "@/lib/api";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.generateReport(user)) return fail(403, "Forbidden");
    const report = await prisma.report.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
      include: {
        participant: true,
        generatedBy: { select: { fullName: true } },
        versions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!report) return fail(404, "Not found");
    return ok({ report });
  } catch (e) {
    return handleError(e);
  }
}
