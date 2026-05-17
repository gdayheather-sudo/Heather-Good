'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ARTIFACT_TYPES, type ArtifactType } from '@/lib/prompts';
import ArtifactCard from '@/components/ArtifactCard';

type Kit = {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'generated' | 'error';
  is_unlocked: boolean;
  inputs: Record<string, unknown>;
};

type ArtifactRow = {
  artifact_type: ArtifactType;
  content: Record<string, unknown>;
  position: number;
};

export default function KitView({
  kit: initialKit,
  artifacts: initialArtifacts,
  creditsAvailable,
}: {
  kit: Kit;
  artifacts: ArtifactRow[];
  creditsAvailable: number;
}) {
  const router = useRouter();
  const [kit, setKit] = useState(initialKit);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll while generating.
  useEffect(() => {
    if (kit.status !== 'generating' && kit.status !== 'draft') return;
    const supabase = createClient();
    let cancelled = false;
    const tick = async () => {
      const { data: k } = await supabase
        .from('kits')
        .select('id, name, status, is_unlocked, inputs')
        .eq('id', kit.id)
        .maybeSingle();
      if (cancelled || !k) return;
      if (k.status !== kit.status) {
        setKit(k as Kit);
        if (k.status === 'generated') {
          const { data: a } = await supabase
            .from('kit_artifacts')
            .select('artifact_type, content, position')
            .eq('kit_id', kit.id)
            .order('position');
          setArtifacts((a as ArtifactRow[]) ?? []);
        }
      }
    };
    const id = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [kit.id, kit.status]);

  const ordered = useMemo(() => {
    const byType = new Map(artifacts.map((a) => [a.artifact_type, a]));
    return ARTIFACT_TYPES
      .map((t) => byType.get(t))
      .filter((x): x is ArtifactRow => !!x);
  }, [artifacts]);

  async function regenerate() {
    setBusy(true);
    setError(null);
    setKit((k) => ({ ...k, status: 'generating' }));
    const res = await fetch('/api/generate-kit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kit_id: kit.id }),
    });
    if (!res.ok) {
      setError('Generation failed. Try again.');
      setKit((k) => ({ ...k, status: 'error' }));
    }
    setBusy(false);
  }

  async function unlock() {
    if (creditsAvailable < 1) {
      // straight to checkout
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kit_id: kit.id }),
      });
      const { url, error } = await res.json();
      if (url) window.location.href = url;
      else setError(error || 'Could not start checkout.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/unlock-kit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kit_id: kit.id }),
    });
    setBusy(false);
    if (res.ok) {
      setKit((k) => ({ ...k, is_unlocked: true }));
      router.refresh();
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Unlock failed.' }));
      setError(error || 'Unlock failed.');
    }
  }

  async function saveArtifact(type: ArtifactType, content: Record<string, unknown>) {
    setArtifacts((prev) =>
      prev.map((a) => (a.artifact_type === type ? { ...a, content } : a))
    );
    await fetch('/api/save-artifact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kit_id: kit.id, artifact_type: type, content }),
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p className="text-sage uppercase tracking-[0.2em] text-xs mb-2">
            Onboarding kit
          </p>
          <h1 className="serif text-3xl text-navy">{kit.name}</h1>
          <p className="text-xs text-charcoal/60 mt-1">
            Status: {kit.status} · {kit.is_unlocked ? 'unlocked' : 'locked preview'}
          </p>
        </div>
        <div className="flex gap-2">
          {kit.is_unlocked && (
            <>
              <a
                href={`/api/export/${kit.id}/docx`}
                className="px-4 py-2 rounded-md border border-navy/20 hover:border-clay text-sm"
              >
                Export .docx
              </a>
              <a
                href={`/api/export/${kit.id}/pdf`}
                className="px-4 py-2 rounded-md border border-navy/20 hover:border-clay text-sm"
              >
                Export .pdf
              </a>
            </>
          )}
        </div>
      </div>

      {kit.status === 'generating' && (
        <div className="rounded-md border border-navy/10 p-4 bg-white/60 mb-6">
          <p className="text-charcoal/70 text-sm">
            Generating your kit… this usually takes 20–40 seconds.
          </p>
        </div>
      )}

      {kit.status === 'error' && (
        <div className="rounded-md border border-clay/40 p-4 bg-white mb-6">
          <p className="text-clay text-sm mb-2">
            Something went wrong while generating. Try again.
          </p>
          <button
            onClick={regenerate}
            disabled={busy}
            className="bg-clay text-warm px-4 py-2 rounded-md text-sm"
          >
            Retry generation
          </button>
        </div>
      )}

      {kit.status === 'generated' && !kit.is_unlocked && (
        <div className="rounded-lg border border-clay/30 bg-clay/5 p-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="serif text-lg text-navy">Unlock your full kit</h2>
            <p className="text-charcoal/70 text-sm mt-1">
              {creditsAvailable > 0
                ? `Uses 1 of your ${creditsAvailable} remaining credit${creditsAvailable === 1 ? '' : 's'}.`
                : '$27 unlocks 3 kits — edit them, export to .docx or .pdf, copy to clipboard.'}
            </p>
          </div>
          <button
            onClick={unlock}
            disabled={busy}
            className="bg-clay text-warm px-5 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {creditsAvailable > 0 ? 'Use a credit to unlock' : 'Buy & unlock — $27'}
          </button>
        </div>
      )}

      {error && <p className="text-clay text-sm mb-4">{error}</p>}

      <div className="space-y-4">
        {ordered.map((a) => (
          <ArtifactCard
            key={a.artifact_type}
            type={a.artifact_type}
            content={a.content}
            locked={!kit.is_unlocked}
            onSave={(content) => saveArtifact(a.artifact_type, content)}
          />
        ))}
      </div>
    </div>
  );
}
