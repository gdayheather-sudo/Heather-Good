import path from 'path';
import { CanvaClient, AutofillData, BrandKit } from '../utils/canva-client';
import { ensureDir } from '../utils/file-helpers';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LinkedInPostInput {
  /** Full post copy exactly as Heather wrote it */
  postText: string;
  /** First line / headline — used as the dominant text element */
  hook: string;
  /** Closing line or call-to-action (optional) */
  optionalCta?: string;
}

export interface LinkedInDesignResult {
  squarePath: string;
  portraitPath: string;
  hookUsed: string;
  slug: string;
  flags: string[];
  squareEditUrl?: string;
  portraitEditUrl?: string;
}

// ── Brand constants ──────────────────────────────────────────────────────────

const BRAND_FOOTER = 'The Clarity Hub';
const BRAND_KIT_ID = 'kAEJPAKgFYU'; // https://www.canva.com/brand/kAEJPAKgFYU
const MAX_HOOK_WORDS = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '');
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Returns the body copy: everything in postText that follows the hook.
 * Falls back to the full postText if the hook isn't found at the start.
 */
function extractBodyText(postText: string, hook: string): string {
  const trimmedHook = hook.trim();
  const trimmedPost = postText.trim();

  if (trimmedPost.startsWith(trimmedHook)) {
    return trimmedPost.slice(trimmedHook.length).trim();
  }

  // Hook not at start — return everything except the first sentence as body
  const firstSentenceEnd = trimmedPost.search(/[.!?]\s/);
  if (firstSentenceEnd !== -1) {
    return trimmedPost.slice(firstSentenceEnd + 1).trim();
  }

  return trimmedPost;
}

function getEnvTemplate(key: string, label: string, dimensions: string): string {
  const value = process.env[key];
  if (!value || value === `your_${key.toLowerCase()}_here`) {
    throw new Error(
      `${key} is not set in .env\n\n` +
      `To set up the ${label} template (${dimensions}):\n` +
      `  1. Open Canva and go to The Clarity Hub brand kit:\n` +
      `     https://www.canva.com/brand/kAEJPAKgFYU\n` +
      `  2. Create a new design at ${dimensions} using this brand kit\n` +
      `     — Background: Warm White #F7F4EF\n` +
      `     — Hook text: DM Serif Display (large, most prominent)\n` +
      `     — Body text: DM Sans (medium weight, min 18px)\n` +
      `     — CTA text: DM Sans (small, Soft Clay or Muted Sage tone)\n` +
      `     — Footer: "The Clarity Hub", DM Sans small, bottom of design\n` +
      `  3. Select each text element → "Connect data" in the right panel\n` +
      `     → name it exactly: hook | body_text | cta | footer\n` +
      `  4. Click "Share" → "Brand template" → "Publish"\n` +
      `     Copy the template ID from the URL:\n` +
      `     canva.com/brand-templates/<ID>/edit\n` +
      `  5. Add to .env: ${key}=<paste-id-here>`
    );
  }
  return value;
}

function formatBrandKitSummary(kit: BrandKit): string {
  const colors = kit.colors?.palette
    .map(c => `${c.name ? c.name + ' ' : ''}${c.color.hex}`)
    .slice(0, 5)
    .join(', ');
  const fonts = kit.fonts?.primary
    .map(f => f.name)
    .slice(0, 3)
    .join(', ');
  const parts: string[] = [];
  if (colors) parts.push(`colours: ${colors}`);
  if (fonts)  parts.push(`fonts: ${fonts}`);
  return parts.length ? `  Brand kit "${kit.name}": ${parts.join(' | ')}` : '';
}

// ── Main agent ────────────────────────────────────────────────────────────────

export async function runLinkedInDesigner(
  input: LinkedInPostInput
): Promise<LinkedInDesignResult> {
  const flags: string[] = [];

  // ── Validate API + template config ────────────────────────────────────────
  const squareTemplateId = getEnvTemplate(
    'CANVA_SQUARE_TEMPLATE_ID',
    'square',
    '1080×1080'
  );
  const portraitTemplateId = getEnvTemplate(
    'CANVA_PORTRAIT_TEMPLATE_ID',
    'portrait',
    '1080×1350'
  );

  const client = new CanvaClient();

  // ── Confirm brand kit is accessible (validates token scope too) ───────────
  const brandKitId = process.env.CANVA_BRAND_KIT_ID ?? BRAND_KIT_ID;
  try {
    const kit = await client.getBrandKit(brandKitId);
    const summary = formatBrandKitSummary(kit);
    if (summary) console.log(summary);
  } catch {
    // Non-fatal — brand kit fetch is best-effort; missing brandkit:content:read
    // scope won't block the autofill flow
    console.log(`  Brand kit ${brandKitId} (fetch skipped — add brandkit:content:read scope to see palette)`);
  }

  // ── Validate hook length ──────────────────────────────────────────────────
  const hookWords = wordCount(input.hook);
  if (hookWords > MAX_HOOK_WORDS) {
    flags.push(
      `Hook is ${hookWords} words (recommended max: ${MAX_HOOK_WORDS}). ` +
      `Used as-is — consider identifying a shorter headline for maximum impact.`
    );
  }

  // ── Prepare text content (Heather's words, never rewritten) ──────────────
  const body = extractBodyText(input.postText, input.hook);
  const cta = input.optionalCta ?? '';

  const autofillData: AutofillData = {
    hook:      { type: 'text', text: input.hook },
    body_text: { type: 'text', text: body },
    cta:       { type: 'text', text: cta },
    footer:    { type: 'text', text: BRAND_FOOTER },
  };

  // ── Build output paths ────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = slugify(input.hook);
  const outputDir = path.join('output', 'linkedin', dateStr);
  ensureDir(outputDir);

  const squarePath   = path.join(outputDir, `square_${slug}.png`);
  const portraitPath = path.join(outputDir, `portrait_${slug}.png`);

  const shortTitle = input.hook.slice(0, 45).trimEnd();

  // ── Square 1080×1080 ──────────────────────────────────────────────────────
  console.log('  [1/4] Autofilling square template (1080×1080)...');
  const squareDesign = await client.autofillBrandTemplate(
    squareTemplateId,
    `LinkedIn Square — ${shortTitle}`,
    autofillData
  );
  console.log(`        Design created: ${squareDesign.id}`);

  console.log('  [2/4] Exporting square as PNG...');
  await client.exportDesignAsPng(squareDesign.id, squarePath);
  console.log(`        Saved: ${squarePath}`);

  // ── Portrait 1080×1350 ────────────────────────────────────────────────────
  console.log('  [3/4] Autofilling portrait template (1080×1350)...');
  const portraitDesign = await client.autofillBrandTemplate(
    portraitTemplateId,
    `LinkedIn Portrait — ${shortTitle}`,
    autofillData
  );
  console.log(`        Design created: ${portraitDesign.id}`);

  console.log('  [4/4] Exporting portrait as PNG...');
  await client.exportDesignAsPng(portraitDesign.id, portraitPath);
  console.log(`        Saved: ${portraitPath}`);

  return {
    squarePath,
    portraitPath,
    hookUsed: input.hook,
    slug,
    flags,
    squareEditUrl:   squareDesign.urls?.edit_url,
    portraitEditUrl: portraitDesign.urls?.edit_url,
  };
}
