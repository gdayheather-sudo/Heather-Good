import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { fail, handleError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await requireUser();
    if (!can.generateReport(user)) return fail(403, "Forbidden");

    const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
    const report = await prisma.report.findFirst({
      where: { id: params.id, organisationId: user.organisationId },
    });
    if (!report) return fail(404, "Not found");

    const path = format === "docx" ? report.docxPath : report.pdfPath;
    if (!path) return fail(409, "File not yet ready");

    const data = await fs.readFile(path);
    const filename = `${report.title.replace(/[^a-z0-9-_ ]/gi, "_")}.${format}`;
    const contentType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
    return new NextResponse(data, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
