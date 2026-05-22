import Anthropic from "@anthropic-ai/sdk";

// Server-only Anthropic client. The API key is never exposed to the browser —
// all calls happen inside route handlers / server components.
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Tech stack locks "Claude Sonnet 4"; allow an env override for future bumps.
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// Best-effort extraction of a JSON object from a model reply that may be
// wrapped in prose or a ```json fence.
export function parseJsonReply<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in model reply");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
