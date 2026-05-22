import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { loadPrompt } from "@/lib/prompts";
import type { InterviewMessage } from "@/lib/types";

export const runtime = "nodejs";

// Streams the interviewer's next question. The client POSTs the user's latest
// turn (or an empty message to kick off the opening question from the seed).
// The full transcript is persisted once the stream completes.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentUnitId, message } = (await request.json()) as {
    contentUnitId: string;
    message?: string;
  };

  const { data: unit } = await supabase
    .from("content_units")
    .select("id, track")
    .eq("id", contentUnitId)
    .single();
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: interview } = await supabase
    .from("interviews")
    .select("id, messages")
    .eq("content_unit_id", contentUnitId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (!interview)
    return NextResponse.json({ error: "No interview" }, { status: 404 });

  const history = (interview.messages as InterviewMessage[]) ?? [];
  const trimmed = message?.trim();
  if (trimmed) {
    history.push({
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    });
  }

  const system = loadPrompt(
    unit.track === "linkedin_led"
      ? "interview_linkedin"
      : "interview_substack_article"
  );

  const anthropic = getAnthropic();
  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        history.push({
          role: "assistant",
          content: assistantText,
          timestamp: new Date().toISOString(),
        });
        await supabase
          .from("interviews")
          .update({ messages: history })
          .eq("id", interview.id);

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
