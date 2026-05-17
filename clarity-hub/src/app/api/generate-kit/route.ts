import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { KIT_SYSTEM_PROMPT, ARTIFACT_TYPES, type ArtifactType } from '@/lib/prompts';
import { parseJsonLoose } from '@/lib/json';
import type { GeneratedKit } from '@/lib/kit-types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { kit_id } = await req.json();
  if (!kit_id) return NextResponse.json({ error: 'kit_id required' }, { status: 400 });

  // Owner check via RLS-respecting client.
  const { data: kit } = await supabase
    .from('kits')
    .select('id, inputs')
    .eq('id', kit_id)
    .maybeSingle();
  if (!kit) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const service = createServiceClient();

  await service.from('kits').update({ status: 'generating' }).eq('id', kit_id);

  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: KIT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(kit.inputs) }],
    });

    const text = msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    const parsed = parseJsonLoose<GeneratedKit>(text);

    // Replace any previous artifacts for this kit.
    await service.from('kit_artifacts').delete().eq('kit_id', kit_id);

    const rows = ARTIFACT_TYPES.map((t, i) => ({
      kit_id,
      artifact_type: t as ArtifactType,
      content: (parsed as Record<string, unknown>)[t] ?? {},
      position: i,
    }));
    const { error: insertErr } = await service.from('kit_artifacts').insert(rows);
    if (insertErr) throw insertErr;

    await service.from('kits').update({ status: 'generated' }).eq('id', kit_id);

    await service.from('generations').insert({
      user_id: user.id,
      kit_id,
      model: CLAUDE_MODEL,
      input_tokens: msg.usage?.input_tokens ?? null,
      output_tokens: msg.usage?.output_tokens ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await service.from('kits').update({ status: 'error' }).eq('id', kit_id);
    const message = err instanceof Error ? err.message : 'generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
