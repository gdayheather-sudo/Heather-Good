import OpenAI, { toFile } from "openai";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  cached = new OpenAI({ apiKey });
  return cached;
}

export async function transcribeAudio(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const client = getOpenAI();
  const file = await toFile(buffer, filename);
  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
  });
  return result.text.trim();
}
