import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOADS_DIR } from '../db.js';
import { getSetting } from '../settings.js';
import { PLATFORM_MAP } from '../constants.js';

// ── JSON schema for multi-platform copy generation ────────────────────────────
const COPY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    variants: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          platform: { type: 'string' },
          body: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          image_prompt: { type: 'string' },
        },
        required: ['platform', 'body', 'hashtags', 'image_prompt'],
      },
    },
  },
  required: ['summary', 'variants'],
};

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif',
};

function readImageBase64(relPath) {
  const abs = join(UPLOADS_DIR, relPath.replace(/^\/?uploads\//, ''));
  const data = readFileSync(abs).toString('base64');
  const media = MIME[extname(abs).toLowerCase()] || 'image/png';
  return { data, media };
}

function brandContext(brand, assets = []) {
  const lines = [
    `Brand name: ${brand.name}`,
    brand.description && `What they do: ${brand.description}`,
    brand.voice && `Voice & tone: ${brand.voice}`,
    brand.audience && `Audience: ${brand.audience}`,
    brand.guidelines && `Brand guidelines / rules: ${brand.guidelines}`,
    brand.website && `Website: ${brand.website}`,
  ].filter(Boolean);

  const examples = assets.filter((a) => a.kind === 'example' && a.caption);
  if (examples.length) {
    lines.push('\nExamples of existing posts that represent this brand well:');
    examples.forEach((e, i) => lines.push(`  ${i + 1}. ${e.caption}`));
  }
  return lines.join('\n');
}

function buildSystemPrompt(brand, assets) {
  return [
    'You are a senior social media manager and copywriter who writes platform-native captions.',
    'You deeply understand the brand below and always match its voice, never generic marketing-speak.',
    '',
    '=== BRAND BRIEF ===',
    brandContext(brand, assets),
    '',
    'Rules:',
    '- Write copy that sounds like THIS brand, reusing vocabulary and tone from the examples.',
    '- Tailor each platform to its own conventions and character budget.',
    '- hashtags must be an array of tags WITHOUT spaces (the leading # is optional).',
    '- image_prompt: a vivid, concrete prompt an image generator can use, on-brand and on-platform aspect.',
    '- Return ONLY the requested JSON. No commentary.',
  ].join('\n');
}

function buildUserPrompt(concept, platforms, instructions, hasReferenceImages) {
  const platformLines = platforms.map((id) => {
    const p = PLATFORM_MAP[id];
    return p
      ? `- ${p.name} (id "${p.id}"): aim for <= ${p.char_limit} chars. ${p.notes}`
      : `- ${id}`;
  });
  return [
    `Create social media posts from this brief:\n"""${concept}"""`,
    instructions ? `\nExtra instructions: ${instructions}` : '',
    hasReferenceImages
      ? '\nReference image(s) are attached — use them to inform the look, subject and image_prompt.'
      : '',
    '\nProduce one variant per platform below:',
    ...platformLines,
    '\nReturn JSON with: summary (1 sentence on the angle you took) and variants[] ' +
      '(each: platform, body, hashtags[], image_prompt).',
  ].join('\n');
}

function normaliseResult(parsed, platforms) {
  const variants = Array.isArray(parsed?.variants) ? parsed.variants : [];
  // keep order of requested platforms; fall back to whatever came back
  const byPlatform = new Map(variants.map((v) => [String(v.platform).toLowerCase(), v]));
  const ordered = platforms
    .map((id) => byPlatform.get(id) || variants.find((v) => !v._used && (v._used = true)))
    .filter(Boolean);
  const list = (ordered.length ? ordered : variants).map((v) => ({
    platform: String(v.platform || '').toLowerCase(),
    body: String(v.body || '').trim(),
    hashtags: (Array.isArray(v.hashtags) ? v.hashtags : String(v.hashtags || '').split(/[\s,]+/))
      .map((h) => String(h).replace(/^#/, '').trim())
      .filter(Boolean),
    image_prompt: String(v.image_prompt || '').trim(),
  }));
  return { summary: String(parsed?.summary || '').trim(), variants: list };
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  throw new Error('Model did not return valid JSON.');
}

// ── Claude (Anthropic) copy generation ────────────────────────────────────────
async function generateWithClaude({ system, userPrompt, images }) {
  const apiKey = getSetting('anthropic_api_key');
  if (!apiKey) throw new Error('No Anthropic API key set. Add one in Settings.');
  const client = new Anthropic({ apiKey });

  const content = [];
  for (const img of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.media, data: img.data } });
  }
  content.push({ type: 'text', text: userPrompt });

  const base = {
    model: getSetting('anthropic_model') || 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content }],
  };

  let resp;
  try {
    resp = await client.messages.create({
      ...base,
      output_config: { format: { type: 'json_schema', schema: COPY_SCHEMA } },
    });
  } catch (err) {
    // Older SDK/model without structured outputs — the prompt already asks for
    // JSON-only, so retry plainly and parse robustly.
    if (err && (err.status === 400 || err.status === 404)) {
      resp = await client.messages.create(base);
    } else {
      throw err;
    }
  }
  const textBlock = (resp.content || []).find((b) => b.type === 'text');
  return extractJson(textBlock ? textBlock.text : '');
}

// ── OpenAI (ChatGPT) copy generation ──────────────────────────────────────────
async function generateWithOpenAI({ system, userPrompt, images }) {
  const apiKey = getSetting('openai_api_key');
  if (!apiKey) throw new Error('No OpenAI API key set. Add one in Settings.');
  const client = new OpenAI({ apiKey });

  const userContent = [{ type: 'text', text: userPrompt }];
  for (const img of images) {
    userContent.push({ type: 'image_url', image_url: { url: `data:${img.media};base64,${img.data}` } });
  }

  const resp = await client.chat.completions.create({
    model: getSetting('openai_model') || 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'social_posts', schema: COPY_SCHEMA, strict: true },
    },
  });
  return extractJson(resp.choices?.[0]?.message?.content || '');
}

/**
 * Generate per-platform copy for a brand.
 * @returns {Promise<{summary:string, variants:Array}>}
 */
export async function generateCopy({ provider, brand, assets, concept, platforms, instructions, referenceAssets = [] }) {
  if (!concept || !concept.trim()) throw new Error('A brief / concept is required.');
  if (!platforms || !platforms.length) throw new Error('Pick at least one platform.');

  const images = [];
  for (const a of referenceAssets) {
    if (a.file_path) {
      try { images.push(readImageBase64(a.file_path)); } catch { /* skip unreadable */ }
    }
  }

  const system = buildSystemPrompt(brand, assets);
  const userPrompt = buildUserPrompt(concept, platforms, instructions, images.length > 0);
  const args = { system, userPrompt, images };

  const parsed = provider === 'openai'
    ? await generateWithOpenAI(args)
    : await generateWithClaude(args);
  return normaliseResult(parsed, platforms);
}

// ── Image generation (OpenAI only — Claude cannot generate images) ────────────
export async function generateImage({ prompt, platform }) {
  if (!prompt || !prompt.trim()) throw new Error('An image prompt is required.');
  const apiKey = getSetting('openai_api_key');
  if (!apiKey) throw new Error('Image generation needs an OpenAI API key. Add one in Settings.');
  const client = new OpenAI({ apiKey });

  const size = (PLATFORM_MAP[platform] && PLATFORM_MAP[platform].image_size) || '1024x1024';
  const resp = await client.images.generate({
    model: getSetting('openai_image_model') || 'gpt-image-1',
    prompt,
    size,
    n: 1,
  });

  const item = resp.data?.[0] || {};
  let buffer;
  if (item.b64_json) {
    buffer = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const r = await fetch(item.url);
    buffer = Buffer.from(await r.arrayBuffer());
  } else {
    throw new Error('Image API returned no image data.');
  }

  const filename = `img-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
  writeFileSync(join(UPLOADS_DIR, filename), buffer);
  return { image_path: filename, size };
}

export function providerStatus() {
  return {
    anthropic: !!getSetting('anthropic_api_key'),
    openai: !!getSetting('openai_api_key'),
  };
}
