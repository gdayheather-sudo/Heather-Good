import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { availableCredits } from '@/lib/credits';
import KitView from './KitView';

export const dynamic = 'force-dynamic';

export default async function KitPage({ params }: { params: { kitId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: kit } = await supabase
    .from('kits')
    .select('id, name, status, is_unlocked, inputs')
    .eq('id', params.kitId)
    .maybeSingle();

  if (!kit) notFound();

  const { data: artifacts } = await supabase
    .from('kit_artifacts')
    .select('artifact_type, content, position')
    .eq('kit_id', params.kitId)
    .order('position');

  const credits = await availableCredits(supabase, user.id, 'onboarding_builder');

  return (
    <KitView
      kit={kit}
      artifacts={artifacts ?? []}
      creditsAvailable={credits}
    />
  );
}
