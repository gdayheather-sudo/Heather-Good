'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const VOICES = ['warm', 'professional', 'playful', 'bold', 'calm'] as const;

export default function AccountForm({
  email,
  businessName,
  defaultBrandVoice,
}: {
  email: string;
  businessName: string;
  defaultBrandVoice: string;
}) {
  const [name, setName] = useState(businessName);
  const [voice, setVoice] = useState(defaultBrandVoice);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .upsert({ id: user.id, business_name: name, default_brand_voice: voice });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <span className="text-sm text-charcoal/70">Email</span>
        <p className="text-charcoal">{email}</p>
      </div>
      <label className="block">
        <span className="text-sm text-charcoal/70">Business name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 bg-warm"
        />
      </label>
      <label className="block">
        <span className="text-sm text-charcoal/70">Default brand voice</span>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 bg-warm"
        >
          <option value="">Choose…</option>
          {VOICES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-clay text-warm px-5 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-sage text-sm">Saved.</span>}
      </div>
    </form>
  );
}
