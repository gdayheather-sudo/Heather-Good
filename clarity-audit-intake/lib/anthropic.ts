import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-4-7";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  cached = new Anthropic({ apiKey });
  return cached;
}

export async function generateDocument(opts: {
  systemPrompt: string;
  userPayload: string;
  maxTokens: number;
}): Promise<string> {
  const client = getAnthropic();
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.systemPrompt,
    messages: [{ role: "user", content: opts.userPayload }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
