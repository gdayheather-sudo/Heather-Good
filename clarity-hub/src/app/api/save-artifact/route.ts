import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ARTIFACT_TYPES } from '@/lib/prompts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { kit_id, artifact_type, content } = await req.json();
  if (!kit_id || !ARTIFACT_TYPES.includes(artifact_type)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Owner check enforced by RLS on kits → kit_artifacts.
  const { data: kit } = await supabase
    .from('kits')
    .select('id, is_unlocked')
    .eq('id', kit_id)
    .maybeSingle();
  if (!kit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!kit.is_unlocked) {
    return NextResponse.json({ error: 'locked' }, { status: 403 });
  }

  const { error } = await supabase
    .from('kit_artifacts')
    .update({ content })
    .eq('kit_id', kit_id)
    .eq('artifact_type', artifact_type);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
