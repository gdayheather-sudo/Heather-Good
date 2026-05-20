import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getSessionByToken } from "@/lib/sessions";
import { processSession } from "@/lib/process";

export const runtime = "nodejs";
export const maxDuration = 60;

// Internal endpoint. Re-runs generation + email for a submitted session.
// Useful as a manual retry when the background job (in /submit) has failed.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (session.status === "pending" || session.status === "in_progress") {
    return NextResponse.json(
      { error: "Session has not been submitted yet." },
      { status: 409 }
    );
  }

  try {
    await processSession(session);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("process route failed:", err);
    await getServiceClient()
      .from("intake_sessions")
      .update({ status: "failed" })
      .eq("id", session.id);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
