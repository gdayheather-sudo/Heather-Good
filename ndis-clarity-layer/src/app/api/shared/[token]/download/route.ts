import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/db";
import { fail, handleError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
    const report = await prisma.report.findUnique({
      where: { shareToken: params.token },
    });
    if (!report || !report.shareToken) return fail(404, "Not found");
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
