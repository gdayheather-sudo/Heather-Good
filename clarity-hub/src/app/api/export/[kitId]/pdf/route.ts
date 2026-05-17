import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ARTIFACT_TYPES, type ArtifactType } from '@/lib/prompts';
import { buildKitPdf } from '@/lib/export/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { kitId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: kit } = await supabase
    .from('kits')
    .select('id, name, is_unlocked')
    .eq('id', params.kitId)
    .maybeSingle();
  if (!kit) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!kit.is_unlocked) return NextResponse.json({ error: 'locked' }, { status: 402 });

  const { data: artifacts } = await supabase
    .from('kit_artifacts')
    .select('artifact_type, content, position')
    .eq('kit_id', params.kitId)
    .order('position');

  const byType = new Map((artifacts ?? []).map((a) => [a.artifact_type as ArtifactType, a]));
  const ordered = ARTIFACT_TYPES
    .map((t) => byType.get(t))
    .filter(Boolean) as Array<{ artifact_type: ArtifactType; content: Record<string, unknown> }>;

  const buf = await buildKitPdf(kit.name, ordered);
  const safe = kit.name.replace(/[^\w-]+/g, '_');

  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${safe}.pdf"`,
    },
  });
}
