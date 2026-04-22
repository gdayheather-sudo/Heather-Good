// Netlify Function — proxy to Anthropic's Messages API.
// Keeps ANTHROPIC_API_KEY server-side and rate-limits per client IP.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 2000;
const MIN_LEN = 10;
const MAX_LEN = 10000;

const SYSTEM_PROMPT = `You are helping turn a messy brain dump into a clean, professional SOP for a business.

Below is the brain dump (may be voice transcript, bullets, or stream of consciousness). Don't ask for more detail — use sensible defaults and flag anything you assumed.

Return ONLY a JSON object with this exact shape, no markdown, no preamble, no backticks:

{
  "processName": "clear searchable name",
  "purpose": "one sentence on why this process exists",
  "trigger": "what starts it",
  "frequency": "how often",
  "owner": "who is responsible",
  "toolsUsed": ["tool1", "tool2"],
  "steps": [{"action": "action description", "owner": "who does it", "tool": "tool or location"}],
  "inputsNeeded": ["input1"],
  "outputsProduced": ["output1"],
  "knownFailurePoints": ["failure1"],
  "assumptionsToConfirm": ["assumption1"]
}

Rules: Plain English. Active voice. Steps small enough a new hire could follow. Flag assumptions.`;

// ---- Rate limiting: per-instance in-memory IP counter ----
// Resets when the function cold-starts. Good enough at low traffic; swap for
// Upstash Redis if abuse becomes a concern.
const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const hits = new Map();

function rateLimitOk(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  // Occasional cleanup so the Map doesn't grow unbounded.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.length || v[v.length - 1] < now - WINDOW_MS) hits.delete(k);
    }
  }
  return true;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (!rateLimitOk(ip)) {
    return jsonResponse(429, {
      error:
        "You've hit the hourly limit. Come back in an hour or reach out at hello@clarityhub.com.au.",
    });
  }

  let brainDump;
  try {
    const body = await req.json();
    brainDump = body?.brainDump;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  if (!brainDump || typeof brainDump !== 'string' || brainDump.trim().length < MIN_LEN) {
    return jsonResponse(400, { error: 'Brain dump too short' });
  }
  if (brainDump.length > MAX_LEN) {
    return jsonResponse(400, { error: 'Brain dump too long (max 10,000 characters)' });
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: `${SYSTEM_PROMPT}\n\nBrain dump:\n\n${brainDump}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in model response');
    }

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('generate-sop: JSON parse failed. Raw:', textBlock.text);
      return jsonResponse(502, {
        error: 'The model returned a response we couldn\u2019t parse. Try simplifying your input and try again.',
      });
    }

    return jsonResponse(200, parsed);
  } catch (err) {
    console.error('generate-sop error:', err);
    return jsonResponse(500, { error: 'Generation failed. Please try again.' });
  }
};

export const config = {
  path: '/api/generate-sop',
};
