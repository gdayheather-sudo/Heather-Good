"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, parseJsonReply } from "@/lib/anthropic";
import { loadPrompt } from "@/lib/prompts";
import {
  type InterviewMessage,
  type PostStatus,
  type Track,
} from "@/lib/types";

// Remove a single surrounding ```/```markdown fence if the model added one.
function stripCodeFence(text: string): string {
  const fenced = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1].trim() : text;
}

// ---------------------------------------------------------------------------
// Seed capture
// ---------------------------------------------------------------------------
export async function createSeed(formData: FormData) {
  const track = formData.get("track") as Track;
  const seedText = (formData.get("seed_text") as string)?.trim();
  const tagsRaw = (formData.get("topic_tags") as string) ?? "";
  const topic_tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!track || !seedText) throw new Error("Track and seed text are required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: unit, error } = await supabase
    .from("content_units")
    .insert({ track, seed_text: seedText, topic_tags, user_id: user.id })
    .select("id")
    .single();
  if (error || !unit) throw new Error(error?.message ?? "Failed to create seed");

  // Start the interview with the seed as the first user turn.
  const firstMessage: InterviewMessage = {
    role: "user",
    content: seedText,
    timestamp: new Date().toISOString(),
  };
  await supabase.from("interviews").insert({
    content_unit_id: unit.id,
    messages: [firstMessage],
    status: "in_progress",
  });

  revalidatePath("/ideas");
  redirect(`/unit/${unit.id}`);
}

// ---------------------------------------------------------------------------
// Draft generation — turns a completed interview into the primary post
//   Track A -> linkedin (body + 3 hooks)
//   Track B -> substack_article (body)
// ---------------------------------------------------------------------------
export async function generateDraft(contentUnitId: string) {
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("content_units")
    .select("id, track, seed_text")
    .eq("id", contentUnitId)
    .single();
  if (!unit) throw new Error("Content unit not found");

  const { data: interview } = await supabase
    .from("interviews")
    .select("id, messages")
    .eq("content_unit_id", contentUnitId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const transcript = ((interview?.messages as InterviewMessage[]) ?? [])
    .map((m) => `${m.role === "user" ? "Heather" : "Interviewer"}: ${m.content}`)
    .join("\n\n");

  const isTrackA = unit.track === "linkedin_led";
  const system = loadPrompt(isTrackA ? "draft_linkedin" : "draft_substack_article");
  const platform = isTrackA ? "linkedin" : "substack_article";

  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [
      {
        role: "user",
        content: `Seed idea:\n${unit.seed_text}\n\nInterview transcript:\n${transcript}\n\nWrite the draft now.`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Track A returns JSON (body + hooks); Track B returns raw markdown — the
  // long-form article is far more reliable without a JSON wrapper.
  const { body, hook_variants } = isTrackA
    ? parseJsonReply<{ body: string; hook_variants?: string[] }>(text)
    : { body: stripCodeFence(text.trim()), hook_variants: [] as string[] };

  // Upsert the primary post for this unit + platform.
  const { data: existing } = await supabase
    .from("platform_posts")
    .select("id")
    .eq("content_unit_id", contentUnitId)
    .eq("platform", platform)
    .maybeSingle();

  const row = {
    content_unit_id: contentUnitId,
    platform,
    body,
    hook_variants: hook_variants ?? [],
    status: "drafting" as PostStatus,
  };

  if (existing) {
    await supabase
      .from("platform_posts")
      .update({ body: row.body, hook_variants: row.hook_variants })
      .eq("id", existing.id);
  } else {
    await supabase.from("platform_posts").insert(row);
  }

  if (interview?.id) {
    await supabase
      .from("interviews")
      .update({ status: "complete" })
      .eq("id", interview.id);
  }

  revalidatePath(`/unit/${contentUnitId}`);
}

// ---------------------------------------------------------------------------
// Variant generation (Track A only): linkedin -> substack_note | instagram
// ---------------------------------------------------------------------------
export async function generateVariant(
  contentUnitId: string,
  target: "substack_note" | "instagram"
) {
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("platform_posts")
    .select("body")
    .eq("content_unit_id", contentUnitId)
    .eq("platform", "linkedin")
    .maybeSingle();
  if (!source?.body) throw new Error("Generate the LinkedIn draft first");

  const promptName =
    target === "substack_note"
      ? "variant_linkedin_to_substack_note"
      : "variant_linkedin_to_instagram";
  const system = loadPrompt(promptName);

  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system,
    messages: [
      { role: "user", content: `Heather's LinkedIn post:\n\n${source.body}` },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let body = text.trim();
  if (target === "instagram") {
    const parsed = parseJsonReply<{ caption: string; hashtags?: string[] }>(text);
    body = parsed.caption.trim();
    if (parsed.hashtags?.length) body += `\n\n${parsed.hashtags.join(" ")}`;
  }

  const { data: existing } = await supabase
    .from("platform_posts")
    .select("id")
    .eq("content_unit_id", contentUnitId)
    .eq("platform", target)
    .maybeSingle();

  if (existing) {
    await supabase.from("platform_posts").update({ body }).eq("id", existing.id);
  } else {
    await supabase.from("platform_posts").insert({
      content_unit_id: contentUnitId,
      platform: target,
      body,
      status: "drafting",
    });
  }

  revalidatePath(`/unit/${contentUnitId}`);
}

// ---------------------------------------------------------------------------
// Graphic brief generation — prompt chosen by platform
// ---------------------------------------------------------------------------
export async function generateGraphicBrief(postId: string) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("platform_posts")
    .select("id, platform, body, content_unit_id")
    .eq("id", postId)
    .single();
  if (!post?.body) throw new Error("Draft a body before generating a brief");

  const promptName =
    post.platform === "linkedin"
      ? "graphic_brief_linkedin_carousel"
      : post.platform === "substack_article"
        ? "graphic_brief_substack_article"
        : "graphic_brief_single";
  const system = loadPrompt(promptName);

  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: `Finished post:\n\n${post.body}` }],
  });

  const brief = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  await supabase
    .from("platform_posts")
    .update({ graphic_brief: brief })
    .eq("id", postId);

  revalidatePath(`/unit/${post.content_unit_id}`);
}

// ---------------------------------------------------------------------------
// Status / schedule / posting controls
// ---------------------------------------------------------------------------
export async function updatePostStatus(
  postId: string,
  contentUnitId: string,
  status: PostStatus
) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "posted") patch.posted_at = new Date().toISOString();
  await supabase.from("platform_posts").update(patch).eq("id", postId);
  revalidatePath(`/unit/${contentUnitId}`);
  revalidatePath("/dashboard");
}

export async function updateSchedule(
  postId: string,
  contentUnitId: string,
  scheduledFor: string | null
) {
  const supabase = await createClient();
  await supabase
    .from("platform_posts")
    .update({
      scheduled_for: scheduledFor || null,
      ...(scheduledFor ? { status: "scheduled" } : {}),
    })
    .eq("id", postId);
  revalidatePath(`/unit/${contentUnitId}`);
  revalidatePath("/dashboard");
}

export async function updatePostBody(
  postId: string,
  contentUnitId: string,
  body: string
) {
  const supabase = await createClient();
  await supabase.from("platform_posts").update({ body }).eq("id", postId);
  revalidatePath(`/unit/${contentUnitId}`);
}

export async function updatePostedUrl(
  postId: string,
  contentUnitId: string,
  url: string
) {
  const supabase = await createClient();
  await supabase
    .from("platform_posts")
    .update({ posted_url: url || null })
    .eq("id", postId);
  revalidatePath(`/unit/${contentUnitId}`);
}

export async function archiveUnit(contentUnitId: string) {
  const supabase = await createClient();
  await supabase
    .from("content_units")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", contentUnitId);
  revalidatePath("/ideas");
  redirect("/ideas");
}
