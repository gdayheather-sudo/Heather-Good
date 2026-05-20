import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getSessionByToken } from "@/lib/sessions";
import { getQuestion } from "@/lib/questions";
import { countWords } from "@/lib/utils";
import type { InputMethod } from "@/lib/types";

export const runtime = "nodejs";

interface SaveBody {
  question_id?: string;
  input_method?: InputMethod;
  transcript?: string;
  raw_audio_url?: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }
  if (session.status === "submitted" || session.status === "processed") {
    return NextResponse.json(
      { error: "This intake has already been submitted." },
      { status: 409 }
    );
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { question_id, input_method, transcript, raw_audio_url } = body;

  if (!question_id || !getQuestion(question_id)) {
    return NextResponse.json({ error: "Unknown question_id" }, { status: 400 });
  }
  if (input_method !== "voice" && input_method !== "text") {
    return NextResponse.json({ error: "Invalid input_method" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const word_count = countWords(transcript);

  const { error } = await supabase
    .from("intake_responses")
    .upsert(
      {
        session_id: session.id,
        question_id,
        input_method,
        transcript: transcript ?? null,
        raw_audio_url: raw_audio_url ?? null,
        word_count,
      },
      { onConflict: "session_id,question_id" }
    );

  if (error) {
    console.error("save-response error:", error.message);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // First save flips a pending session to in_progress.
  if (session.status === "pending") {
    await supabase
      .from("intake_sessions")
      .update({ status: "in_progress" })
      .eq("id", session.id);
  }

  return NextResponse.json({ ok: true, word_count });
}
