'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { KitInputs } from '@/lib/kit-types';

const DELIVERY = ['one_to_one', 'group', 'project', 'retainer', 'productized'] as const;
const VOICES = ['warm', 'professional', 'playful', 'bold', 'calm'] as const;

type Mode = 'structured' | 'dump';

export default function NewKitForm({
  defaultBusinessName,
  defaultBrandVoice,
}: {
  defaultBusinessName: string;
  defaultBrandVoice: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('structured');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dump, setDump] = useState('');
  const [inputs, setInputs] = useState<KitInputs>({
    business_name: defaultBusinessName,
    service_description: '',
    delivery_model: '',
    client_profile: '',
    needs_from_client: '',
    project_length: '',
    brand_voice: (defaultBrandVoice as KitInputs['brand_voice']) || '',
    tools_mentioned: '',
  });

  function update<K extends keyof KitInputs>(k: K, v: KitInputs[K]) {
    setInputs((s) => ({ ...s, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let finalInputs = inputs;

    if (mode === 'dump') {
      const res = await fetch('/api/extract-dump', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dump }),
      });
      if (!res.ok) {
        setError('Could not read that dump. Try the structured form instead.');
        setBusy(false);
        return;
      }
      finalInputs = { ...inputs, ...(await res.json()) };
    }

    if (!finalInputs.business_name || !finalInputs.service_description) {
      setError('Business name and service description are required.');
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: kit, error: insertErr } = await supabase
      .from('kits')
      .insert({
        user_id: user.id,
        name: `${finalInputs.business_name} onboarding`,
        inputs: finalInputs,
        status: 'draft',
      })
      .select('id')
      .single();

    if (insertErr || !kit) {
      setError(insertErr?.message || 'Could not create kit.');
      setBusy(false);
      return;
    }

    // Kick off generation; the kit detail page will poll status.
    fetch('/api/generate-kit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kit_id: kit.id }),
    }).catch(() => {});

    router.push(`/onboarding/${kit.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="inline-flex rounded-md border border-navy/20 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode('structured')}
          className={`px-4 py-2 ${mode === 'structured' ? 'bg-navy text-warm' : 'bg-warm text-charcoal/70'}`}
        >
          Structured questions
        </button>
        <button
          type="button"
          onClick={() => setMode('dump')}
          className={`px-4 py-2 ${mode === 'dump' ? 'bg-navy text-warm' : 'bg-warm text-charcoal/70'}`}
        >
          Paste a brain-dump
        </button>
      </div>

      {mode === 'dump' ? (
        <label className="block">
          <span className="text-sm text-charcoal/70">
            Tell us about your service, your clients, what you need from them, how
            long things take — however it comes out.
          </span>
          <textarea
            value={dump}
            onChange={(e) => setDump(e.target.value)}
            rows={10}
            required
            placeholder="We do brand identity for wellness coaches, projects run about 5 weeks, I always need their logo files and Canva access, voice is warm but professional…"
            className="mt-1 w-full rounded-md border border-navy/20 px-3 py-2 bg-warm"
          />
        </label>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Business name" required>
            <input
              value={inputs.business_name}
              onChange={(e) => update('business_name', e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="Delivery model">
            <select
              value={inputs.delivery_model}
              onChange={(e) => update('delivery_model', e.target.value as KitInputs['delivery_model'])}
              className="input"
            >
              <option value="">Choose…</option>
              {DELIVERY.map((d) => (
                <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Service description" required className="sm:col-span-2">
            <textarea
              value={inputs.service_description}
              onChange={(e) => update('service_description', e.target.value)}
              required
              rows={3}
              className="input"
            />
          </Field>
          <Field label="Client profile" className="sm:col-span-2">
            <input
              value={inputs.client_profile}
              onChange={(e) => update('client_profile', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="What you need from clients" className="sm:col-span-2">
            <input
              value={inputs.needs_from_client}
              onChange={(e) => update('needs_from_client', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Typical project length">
            <input
              value={inputs.project_length}
              onChange={(e) => update('project_length', e.target.value)}
              placeholder="e.g. 4–6 weeks"
              className="input"
            />
          </Field>
          <Field label="Brand voice">
            <select
              value={inputs.brand_voice}
              onChange={(e) => update('brand_voice', e.target.value as KitInputs['brand_voice'])}
              className="input"
            >
              <option value="">Choose…</option>
              {VOICES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Tools you use" className="sm:col-span-2">
            <input
              value={inputs.tools_mentioned}
              onChange={(e) => update('tools_mentioned', e.target.value)}
              placeholder="Calendly, Dubsado, Google Drive…"
              className="input"
            />
          </Field>
        </div>
      )}

      {error && <p className="text-clay text-sm">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="bg-clay text-warm px-6 py-3 rounded-md hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Generate kit'}
      </button>

      <style jsx>{`
        :global(.input) {
          margin-top: 0.25rem;
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgba(63, 83, 102, 0.2);
          padding: 0.5rem 0.75rem;
          background: #f7f4ef;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-charcoal/70">
        {label}
        {required && <span className="text-clay"> *</span>}
      </span>
      {children}
    </label>
  );
}
