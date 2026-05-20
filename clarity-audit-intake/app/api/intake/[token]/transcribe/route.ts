import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, AUDIO_BUCKET } from "@/lib/supabase/server";
import { getSessionByToken } from "@/lib/sessions";
import { transcribeAudio } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // Whisper hard limit

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await getSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("audio");
  const questionId = form.get("question_id");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Recording too large (max 25MB)." },
      { status: 413 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const type = file.type || "audio/webm";
  const ext = type.includes("mp4")
    ? "mp4"
    : type.includes("mpeg") || type.includes("mp3")
    ? "mp3"
    : type.includes("wav")
    ? "wav"
    : "webm";
  const filename = `recording.${ext}`;

  // Upload raw audio to private storage (best-effort — transcription is the
  // critical path; a storage hiccup shouldn't block the transcript).
  let raw_audio_url: string | null = null;
  try {
    const supabase = getServiceClient();
    const qid = typeof questionId === "string" ? questionId : "unknown";
    const path = `${session.id}/${qid}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, buffer, { contentType: type, upsert: true });
    if (uploadErr) {
      console.error("audio upload error:", uploadErr.message);
    } else {
      raw_audio_url = path;
    }
  } catch (err) {
    console.error("audio upload threw:", err);
  }

  let transcript: string;
  try {
    transcript = await transcribeAudio(buffer, filename);
  } catch (err) {
    console.error("transcription error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please try again or type your answer." },
      { status: 502 }
    );
  }

  return NextResponse.json({ transcript, raw_audio_url });
}
