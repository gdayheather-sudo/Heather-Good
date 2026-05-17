'use client';

import { useState } from 'react';
import type { ArtifactType } from '@/lib/prompts';

const LABELS: Record<ArtifactType, string> = {
  welcome_email_1: 'Email 1 · Immediate welcome',
  welcome_email_2: 'Email 2 · Intake prep nudge',
  welcome_email_3: 'Email 3 · Kickoff-ready',
  welcome_email_4: 'Email 4 · Mid-project check-in',
  intake_form: 'Intake form',
  kickoff_checklist: 'Kickoff checklist',
  onboarding_timeline: 'Onboarding timeline',
};

export default function ArtifactCard({
  type,
  content,
  locked,
  onSave,
}: {
  type: ArtifactType;
  content: Record<string, unknown>;
  locked: boolean;
  onSave: (content: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  function copy() {
    const text = artifactToText(type, content);
    navigator.clipboard.writeText(text);
  }

  async function save() {
    await onSave(draft);
    setEditing(false);
  }

  return (
    <article className="border border-navy/10 rounded-lg bg-white/70">
      <header className="flex items-center justify-between px-5 py-3 border-b border-navy/10">
        <h3 className="serif text-lg text-navy">{LABELS[type]}</h3>
        <div className="flex gap-2 text-xs">
          {!locked && (
            <>
              <button
                onClick={() => (editing ? save() : setEditing(true))}
                className="px-3 py-1 rounded border border-navy/20 hover:border-clay"
              >
                {editing ? 'Save' : 'Edit'}
              </button>
              <button
                onClick={copy}
                className="px-3 py-1 rounded border border-navy/20 hover:border-clay"
              >
                Copy
              </button>
            </>
          )}
        </div>
      </header>

      <div className="p-5">
        {editing ? (
          <Editor type={type} draft={draft} setDraft={setDraft} />
        ) : (
          <Preview type={type} content={content} locked={locked} />
        )}
      </div>
    </article>
  );
}

function Preview({
  type,
  content,
  locked,
}: {
  type: ArtifactType;
  content: Record<string, unknown>;
  locked: boolean;
}) {
  const truncated = locked;

  if (type.startsWith('welcome_email_')) {
    const subject = String((content as any).subject ?? '');
    const body = String((content as any).body ?? '');
    const shown = truncated ? body.slice(0, 240) : body;
    return (
      <div>
        <p className="text-sm text-charcoal/60 mb-1">Subject</p>
        <p className="text-charcoal mb-4">{subject}</p>
        <p className="text-sm text-charcoal/60 mb-1">Body</p>
        <p className="whitespace-pre-wrap text-charcoal/90">{shown}</p>
        {truncated && body.length > 240 && (
          <p className="mt-3 text-sm text-clay">
            …unlock the kit to read & edit the full email.
          </p>
        )}
      </div>
    );
  }

  if (type === 'intake_form') {
    const intro = String((content as any).intro ?? '');
    const questions = ((content as any).questions ?? []) as Array<{
      question: string;
      purpose: string;
    }>;
    const shown = truncated ? questions.slice(0, 3) : questions;
    return (
      <div>
        {intro && <p className="mb-4 text-charcoal/90">{intro}</p>}
        <ol className="list-decimal list-inside space-y-3">
          {shown.map((q, i) => (
            <li key={i}>
              <span className="text-charcoal">{q.question}</span>
              <span className="block text-xs text-charcoal/60 ml-5">
                {q.purpose}
              </span>
            </li>
          ))}
        </ol>
        {truncated && questions.length > 3 && (
          <p className="mt-3 text-sm text-clay">
            …{questions.length - 3} more questions when you unlock.
          </p>
        )}
      </div>
    );
  }

  if (type === 'kickoff_checklist') {
    const founder = ((content as any).founder_tasks ?? []) as string[];
    const client = ((content as any).client_tasks ?? []) as string[];
    const f = truncated ? founder.slice(0, 3) : founder;
    const c = truncated ? client.slice(0, 3) : client;
    return (
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm uppercase tracking-wider text-sage mb-2">
            Your tasks
          </h4>
          <ul className="list-disc list-inside space-y-1 text-charcoal/90">
            {f.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-sm uppercase tracking-wider text-sage mb-2">
            Client tasks
          </h4>
          <ul className="list-disc list-inside space-y-1 text-charcoal/90">
            {c.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  if (type === 'onboarding_timeline') {
    const milestones = (Array.isArray(content) ? content : (content as any).timeline ?? content) as Array<{
      milestone: string;
      when: string;
      detail: string;
    }>;
    const list = Array.isArray(milestones) ? milestones : [];
    const shown = truncated ? list.slice(0, 2) : list;
    return (
      <ol className="space-y-3">
        {shown.map((m, i) => (
          <li key={i} className="flex gap-4">
            <span className="text-sage text-xs uppercase tracking-wider w-20 shrink-0 mt-1">
              {m.when}
            </span>
            <div>
              <p className="text-charcoal">{m.milestone}</p>
              <p className="text-charcoal/60 text-sm">{m.detail}</p>
            </div>
          </li>
        ))}
        {truncated && list.length > 2 && (
          <li className="text-sm text-clay">
            …{list.length - 2} more milestones when you unlock.
          </li>
        )}
      </ol>
    );
  }

  return null;
}

function Editor({
  type,
  draft,
  setDraft,
}: {
  type: ArtifactType;
  draft: Record<string, unknown>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  if (type.startsWith('welcome_email_')) {
    return (
      <div className="space-y-3">
        <input
          value={String((draft as any).subject ?? '')}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          placeholder="Subject"
          className="w-full rounded-md border border-navy/20 px-3 py-2 bg-warm"
        />
        <textarea
          value={String((draft as any).body ?? '')}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          rows={12}
          className="w-full rounded-md border border-navy/20 px-3 py-2 bg-warm font-sans"
        />
      </div>
    );
  }

  // Fallback: free-form JSON edit. Keeps the v1 surface honest without coding
  // a bespoke editor for every artifact type yet.
  return (
    <textarea
      value={JSON.stringify(draft, null, 2)}
      onChange={(e) => {
        try {
          setDraft(JSON.parse(e.target.value));
        } catch {
          /* swallow until valid */
        }
      }}
      rows={16}
      className="w-full font-mono text-sm rounded-md border border-navy/20 px-3 py-2 bg-warm"
    />
  );
}

function artifactToText(type: ArtifactType, content: Record<string, unknown>): string {
  if (type.startsWith('welcome_email_')) {
    return `Subject: ${(content as any).subject}\n\n${(content as any).body}`;
  }
  if (type === 'intake_form') {
    const intro = (content as any).intro ?? '';
    const qs = ((content as any).questions ?? []) as Array<{ question: string; purpose: string }>;
    return [intro, '', ...qs.map((q, i) => `${i + 1}. ${q.question}\n   (${q.purpose})`)].join('\n');
  }
  if (type === 'kickoff_checklist') {
    const f = ((content as any).founder_tasks ?? []) as string[];
    const c = ((content as any).client_tasks ?? []) as string[];
    return `Your tasks:\n${f.map((x) => `- ${x}`).join('\n')}\n\nClient tasks:\n${c.map((x) => `- ${x}`).join('\n')}`;
  }
  if (type === 'onboarding_timeline') {
    const list = (Array.isArray(content) ? content : (content as any).timeline ?? []) as Array<{
      milestone: string; when: string; detail: string;
    }>;
    return list.map((m) => `${m.when} — ${m.milestone}\n   ${m.detail}`).join('\n\n');
  }
  return JSON.stringify(content, null, 2);
}
