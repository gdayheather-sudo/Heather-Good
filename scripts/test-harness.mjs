// Clarity SOP — AI pipeline test harness
//
// Run with:  pnpm harness path/to/audio.m4a
//        or  node scripts/test-harness.mjs path/to/audio.m4a
//
// Requires OPENAI_API_KEY and ANTHROPIC_API_KEY in .env (project root).
// Writes outputs to ./test-output/{basename}.{transcript.json,raw.txt,sop.json}.
//
// Purpose: validate the entire Whisper → Claude pipeline on real audio BEFORE
// building any capture UI. Run this against 8–10 varied recordings and tune
// the system prompt in lib/ai/prompt-sop-structuring.mjs until structuring
// quality is consistent.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SOP_STRUCTURING_SYSTEM_PROMPT } from '../lib/ai/prompt-sop-structuring.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const WHISPER_MODEL = 'whisper-1';

// Pricing — keep in sync with provider pages. Used for rough cost estimates only.
const PRICE_WHISPER_PER_MIN = 0.006; // USD
const PRICE_CLAUDE_INPUT_PER_MTOK = 3; // USD per 1M input tokens (Sonnet)
const PRICE_CLAUDE_OUTPUT_PER_MTOK = 15; // USD per 1M output tokens (Sonnet)

async function transcribe(audioPath) {
  console.log(`\n[1/3] Transcribing ${path.basename(audioPath)}…`);
  const start = Date.now();

  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: WHISPER_MODEL,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `    Done in ${elapsed}s. Duration: ${transcription.duration}s, ${transcription.segments.length} segments.`,
  );
  return transcription;
}

function formatTranscriptForClaude(transcription) {
  return transcription.segments
    .map((s) => `[${s.start.toFixed(1)}s–${s.end.toFixed(1)}s] ${s.text.trim()}`)
    .join('\n');
}

async function structure(transcriptText) {
  console.log(`\n[2/3] Structuring with ${CLAUDE_MODEL}…`);
  const start = Date.now();

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SOP_STRUCTURING_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Transcript with timestamps:\n\n${transcriptText}` },
    ],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const usage = message.usage;
  console.log(
    `    Done in ${elapsed}s. Input: ${usage.input_tokens} tokens, Output: ${usage.output_tokens} tokens.`,
  );

  const textBlock = message.content.find((c) => c.type === 'text');
  if (!textBlock) throw new Error('Claude returned no text content.');
  return { raw: textBlock.text, usage };
}

function parseAndValidate(raw) {
  console.log(`\n[3/3] Parsing JSON…`);
  // Defensive: strip stray code fences in case the model ignores instructions.
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('    ❌ JSON parse failed.');
    console.error('    Raw output:\n', raw);
    throw e;
  }

  if (parsed.error) {
    console.log(`    ⚠️  Model returned error: ${parsed.error} — ${parsed.reason}`);
    return parsed;
  }

  if (!parsed.title) console.warn('    ⚠️  Missing title.');
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    console.warn('    ⚠️  No steps in output.');
  } else {
    console.log(`    ✓ ${parsed.steps.length} steps extracted.`);
    let prevEnd = 0;
    for (const step of parsed.steps) {
      if (typeof step.audio_start_seconds === 'number' && step.audio_start_seconds < prevEnd - 1) {
        console.warn(`    ⚠️  Step ${step.position} timestamp out of order.`);
      }
      prevEnd = step.audio_end_seconds ?? prevEnd;
    }
  }

  return parsed;
}

function printSummary(sop) {
  if (sop.error) return;
  console.log('\n' + '═'.repeat(60));
  console.log(`📋 ${sop.title}`);
  console.log('═'.repeat(60));
  if (sop.purpose) console.log(`Purpose: ${sop.purpose}`);
  if (sop.prerequisites) console.log(`Prereqs: ${sop.prerequisites}`);
  if (sop.estimated_minutes) console.log(`Est. time: ${sop.estimated_minutes} min`);
  console.log('');
  for (const step of sop.steps) {
    console.log(`${step.position}. ${step.title}`);
    console.log(`   ${step.content}`);
    if (step.note) console.log(`   📝 ${step.note}`);
    if (step.audio_start_seconds != null) {
      console.log(`   ⏱  ${step.audio_start_seconds}s → ${step.audio_end_seconds}s`);
    }
    console.log('');
  }
}

async function main() {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.error('Usage: pnpm harness <path-to-audio>');
    console.error('       node scripts/test-harness.mjs <path-to-audio>');
    process.exit(1);
  }
  if (!fs.existsSync(audioPath)) {
    console.error(`File not found: ${audioPath}`);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    console.error('Missing OPENAI_API_KEY or ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }

  const outDir = path.join(ROOT, 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const baseName = path.basename(audioPath, path.extname(audioPath));

  try {
    const transcription = await transcribe(audioPath);
    fs.writeFileSync(
      path.join(outDir, `${baseName}.transcript.json`),
      JSON.stringify(transcription, null, 2),
    );

    const transcriptText = formatTranscriptForClaude(transcription);
    const { raw, usage } = await structure(transcriptText);

    fs.writeFileSync(path.join(outDir, `${baseName}.raw.txt`), raw);

    const sop = parseAndValidate(raw);
    fs.writeFileSync(
      path.join(outDir, `${baseName}.sop.json`),
      JSON.stringify(sop, null, 2),
    );

    printSummary(sop);

    const inputCost = (usage.input_tokens / 1_000_000) * PRICE_CLAUDE_INPUT_PER_MTOK;
    const outputCost = (usage.output_tokens / 1_000_000) * PRICE_CLAUDE_OUTPUT_PER_MTOK;
    const whisperCost = (transcription.duration / 60) * PRICE_WHISPER_PER_MIN;
    const totalCost = inputCost + outputCost + whisperCost;
    console.log(
      `\n💰 Est. cost: $${totalCost.toFixed(4)}  ` +
        `(Whisper $${whisperCost.toFixed(4)} + Claude $${(inputCost + outputCost).toFixed(4)})`,
    );
    console.log(`\nFiles saved to test-output/${baseName}.*`);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
