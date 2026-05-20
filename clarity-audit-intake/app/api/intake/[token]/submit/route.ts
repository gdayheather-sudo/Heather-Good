import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getSessionByToken, getResponses } from "@/lib/sessions";
import { questions } from "@/lib/questions";
import { countWords } from "@/lib/utils";
import { processSession } from "@/lib/process";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (session.status === "submitted" || session.status === "processed") {
    return NextResponse.json({ ok: true, alreadySubmitted: true });
  }

  // Validate every question has an acceptable answer.
  const responses = await getResponses(session.id);
  const byId = new Map(responses.map((r) => [r.question_id, r]));

  const incomplete: { question_id: string; reason: string }[] = [];
  for (const q of questions) {
    const r = byId.get(q.id);
    const words = countWords(r?.transcript);
    if (!r || !r.transcript || words === 0) {
      incomplete.push({ question_id: q.id, reason: "empty" });
      continue;
    }
    // Voice transcripts are accepted as-is; typed answers must meet min_words.
    if (r.input_method === "text" && words < q.min_words) {
      incomplete.push({
        question_id: q.id,
        reason: `needs at least ${q.min_words} words`,
      });
    }
  }

  if (incomplete.length > 0) {
    return NextResponse.json(
      { error: "Some questions still need answers.", incomplete },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const submittedAt = new Date().toISOString();
  const { error } = await supabase
    .from("intake_sessions")
    .update({ status: "submitted", submitted_at: submittedAt })
    .eq("id", session.id);

  if (error) {
    console.error("submit update error:", error.message);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  // Run the heavy pipeline after the response is flushed so the client gets
  // an instant confirmation. Failures flip the session to 'failed'.
  after(async () => {
    try {
      await processSession({
        ...session,
        status: "submitted",
        submitted_at: submittedAt,
      });
    } catch (err) {
      console.error("processSession failed:", err);
      await getServiceClient()
        .from("intake_sessions")
        .update({ status: "failed" })
        .eq("id", session.id);
    }
  });

  return NextResponse.json({ ok: true });
}
