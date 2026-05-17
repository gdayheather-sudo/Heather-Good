import NewKitForm from './NewKitForm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function NewKitPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, default_brand_voice')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">
        Onboarding Builder
      </p>
      <h1 className="serif text-3xl text-navy mb-2">New onboarding kit</h1>
      <p className="text-charcoal/70 mb-8">
        Two ways in: fill the short questionnaire, or paste a brain-dump and we
        extract the fields before generating.
      </p>
      <NewKitForm
        defaultBusinessName={profile?.business_name ?? ''}
        defaultBrandVoice={profile?.default_brand_voice ?? ''}
      />
    </div>
  );
}
