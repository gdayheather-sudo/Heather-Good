import { readFileSync } from "node:fs";
import { join } from "node:path";

// Prompts live in /prompts/*.md and are loaded as raw strings, never hardcoded
// in route handlers. Server-only (uses fs). Cached after first read.
const PROMPT_DIR = join(process.cwd(), "prompts");
const cache = new Map<string, string>();

export type PromptName =
  | "interview_linkedin"
  | "interview_substack_article"
  | "draft_linkedin"
  | "draft_substack_article"
  | "variant_linkedin_to_substack_note"
  | "variant_linkedin_to_instagram"
  | "graphic_brief_linkedin_carousel"
  | "graphic_brief_single"
  | "graphic_brief_substack_article";

export function loadPrompt(name: PromptName): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const raw = readFileSync(join(PROMPT_DIR, `${name}.md`), "utf8");
  cache.set(name, raw);
  return raw;
}
