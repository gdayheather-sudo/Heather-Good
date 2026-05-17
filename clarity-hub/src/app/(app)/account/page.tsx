import { createClient } from '@/lib/supabase/server';
import AccountForm from './AccountForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, default_brand_voice, email')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl">
      <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">Account</p>
      <h1 className="serif text-3xl text-navy mb-6">Your profile</h1>
      <p className="text-charcoal/70 mb-6">
        Set your brand voice once — every tool pre-fills from it.
      </p>
      <AccountForm
        email={profile?.email ?? user.email ?? ''}
        businessName={profile?.business_name ?? ''}
        defaultBrandVoice={profile?.default_brand_voice ?? ''}
      />
    </div>
  );
}
