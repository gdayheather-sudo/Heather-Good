import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { DUMP_EXTRACTION_PROMPT } from '@/lib/prompts';
import { parseJsonLoose } from '@/lib/json';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { dump } = await req.json();
  if (typeof dump !== 'string' || dump.trim().length < 20) {
    return NextResponse.json({ error: 'dump too short' }, { status: 400 });
  }

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: DUMP_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: dump }],
  });

  const text = msg.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  try {
    const parsed = parseJsonLoose<Record<string, string>>(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 422 });
  }
}
