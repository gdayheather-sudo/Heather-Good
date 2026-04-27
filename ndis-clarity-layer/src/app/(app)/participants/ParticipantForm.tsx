"use client";

import { useState } from "react";

interface Goal {
  id?: string;
  title: string;
  description: string;
  tags: string[];
  isActive: boolean;
}
interface Contact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isEmergency: boolean;
  isNominee: boolean;
}
interface Medication {
  name: string;
  notes: string;
}

interface FormState {
  fullName: string;
  preferredName: string;
  dateOfBirth: string;
  goals: Goal[];
  supportContext: {
    communicationPreferences: string;
    routinesAndPreferences: string;
    keySupportStrategies: string;
  };
  riskSafety: {
    knownRisks: string;
    behaviouralSupportNotes: string;
  };
  contacts: Contact[];
  medications: Medication[];
  shareWithFamily: boolean;
  shareWithCoordinator: boolean;
  consentNotes: string;
}

const EMPTY: FormState = {
  fullName: "",
  preferredName: "",
  dateOfBirth: "",
  goals: [],
  supportContext: {
    communicationPreferences: "",
    routinesAndPreferences: "",
    keySupportStrategies: "",
  },
  riskSafety: { knownRisks: "", behaviouralSupportNotes: "" },
  contacts: [],
  medications: [],
  shareWithFamily: false,
  shareWithCoordinator: false,
  consentNotes: "",
};

export default function ParticipantForm({
  mode,
  participantId,
  initial,
}: {
  mode: "create" | "edit";
  participantId?: string;
  initial?: Partial<FormState>;
}) {
  const [s, setS] = useState<FormState>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/participants"
          : `/api/participants/${participantId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      const j = await res.json();
      const id = j.id || participantId;
      window.location.href = `/participants/${id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Section title="Basic info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <input
              required
              className="input"
              value={s.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </Field>
          <Field label="Preferred name">
            <input
              className="input"
              value={s.preferredName}
              onChange={(e) => update("preferredName", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              className="input"
              value={s.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="NDIS goals"
        action={
          <button
            type="button"
            className="btn-outline"
            onClick={() =>
              update("goals", [
                ...s.goals,
                { title: "", description: "", tags: [], isActive: true },
              ])
            }
          >
            Add goal
          </button>
        }
      >
        {s.goals.length === 0 && (
          <p className="text-sm text-ink-500">No goals yet.</p>
        )}
        <div className="space-y-3">
          {s.goals.map((g, idx) => (
            <div key={idx} className="rounded-md border border-ink-200 p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Goal title" required>
                  <input
                    required
                    className="input"
                    value={g.title}
                    onChange={(e) => {
                      const next = [...s.goals];
                      next[idx] = { ...g, title: e.target.value };
                      update("goals", next);
                    }}
                  />
                </Field>
                <Field label="Tags (comma separated)">
                  <input
                    className="input"
                    value={g.tags.join(", ")}
                    onChange={(e) => {
                      const next = [...s.goals];
                      next[idx] = {
                        ...g,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      };
                      update("goals", next);
                    }}
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  className="input min-h-[60px]"
                  value={g.description}
                  onChange={(e) => {
                    const next = [...s.goals];
                    next[idx] = { ...g, description: e.target.value };
                    update("goals", next);
                  }}
                />
              </Field>
              <div className="flex items-center justify-between">
                <label className="text-sm text-ink-600 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={g.isActive}
                    onChange={(e) => {
                      const next = [...s.goals];
                      next[idx] = { ...g, isActive: e.target.checked };
                      update("goals", next);
                    }}
                  />
                  Active
                </label>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    update(
                      "goals",
                      s.goals.filter((_, i) => i !== idx),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Support context">
        <Field label="Communication preferences">
          <textarea
            className="input min-h-[60px]"
            value={s.supportContext.communicationPreferences}
            onChange={(e) =>
              update("supportContext", {
                ...s.supportContext,
                communicationPreferences: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Routines and preferences">
          <textarea
            className="input min-h-[60px]"
            value={s.supportContext.routinesAndPreferences}
            onChange={(e) =>
              update("supportContext", {
                ...s.supportContext,
                routinesAndPreferences: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Key support strategies">
          <textarea
            className="input min-h-[60px]"
            value={s.supportContext.keySupportStrategies}
            onChange={(e) =>
              update("supportContext", {
                ...s.supportContext,
                keySupportStrategies: e.target.value,
              })
            }
          />
        </Field>
      </Section>

      <Section title="Risk and safety">
        <Field label="Known risks">
          <textarea
            className="input min-h-[60px]"
            value={s.riskSafety.knownRisks}
            onChange={(e) =>
              update("riskSafety", {
                ...s.riskSafety,
                knownRisks: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Behavioural support notes">
          <textarea
            className="input min-h-[60px]"
            value={s.riskSafety.behaviouralSupportNotes}
            onChange={(e) =>
              update("riskSafety", {
                ...s.riskSafety,
                behaviouralSupportNotes: e.target.value,
              })
            }
          />
        </Field>
      </Section>

      <Section
        title="Contacts"
        action={
          <button
            type="button"
            className="btn-outline"
            onClick={() =>
              update("contacts", [
                ...s.contacts,
                {
                  name: "",
                  relationship: "",
                  phone: "",
                  email: "",
                  isEmergency: false,
                  isNominee: false,
                },
              ])
            }
          >
            Add contact
          </button>
        }
      >
        {s.contacts.length === 0 && (
          <p className="text-sm text-ink-500">No contacts yet.</p>
        )}
        <div className="space-y-3">
          {s.contacts.map((c, idx) => (
            <div key={idx} className="rounded-md border border-ink-200 p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name" required>
                  <input
                    required
                    className="input"
                    value={c.name}
                    onChange={(e) => {
                      const next = [...s.contacts];
                      next[idx] = { ...c, name: e.target.value };
                      update("contacts", next);
                    }}
                  />
                </Field>
                <Field label="Relationship">
                  <input
                    className="input"
                    value={c.relationship}
                    onChange={(e) => {
                      const next = [...s.contacts];
                      next[idx] = { ...c, relationship: e.target.value };
                      update("contacts", next);
                    }}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    className="input"
                    value={c.phone}
                    onChange={(e) => {
                      const next = [...s.contacts];
                      next[idx] = { ...c, phone: e.target.value };
                      update("contacts", next);
                    }}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className="input"
                    value={c.email}
                    onChange={(e) => {
                      const next = [...s.contacts];
                      next[idx] = { ...c, email: e.target.value };
                      update("contacts", next);
                    }}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm text-ink-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.isEmergency}
                      onChange={(e) => {
                        const next = [...s.contacts];
                        next[idx] = { ...c, isEmergency: e.target.checked };
                        update("contacts", next);
                      }}
                    />
                    Emergency
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={c.isNominee}
                      onChange={(e) => {
                        const next = [...s.contacts];
                        next[idx] = { ...c, isNominee: e.target.checked };
                        update("contacts", next);
                      }}
                    />
                    Family / nominee
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    update(
                      "contacts",
                      s.contacts.filter((_, i) => i !== idx),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Medications (prompting/observing only)"
        action={
          <button
            type="button"
            className="btn-outline"
            onClick={() =>
              update("medications", [...s.medications, { name: "", notes: "" }])
            }
          >
            Add
          </button>
        }
      >
        {s.medications.length === 0 && (
          <p className="text-sm text-ink-500">None recorded.</p>
        )}
        <div className="space-y-3">
          {s.medications.map((m, idx) => (
            <div key={idx} className="rounded-md border border-ink-200 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name" required>
                <input
                  required
                  className="input"
                  value={m.name}
                  onChange={(e) => {
                    const next = [...s.medications];
                    next[idx] = { ...m, name: e.target.value };
                    update("medications", next);
                  }}
                />
              </Field>
              <Field label="Notes (prompting / observing only)">
                <input
                  className="input"
                  value={m.notes}
                  onChange={(e) => {
                    const next = [...s.medications];
                    next[idx] = { ...m, notes: e.target.value };
                    update("medications", next);
                  }}
                />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() =>
                    update(
                      "medications",
                      s.medications.filter((_, i) => i !== idx),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Consent and sharing">
        <div className="flex flex-col gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.shareWithFamily}
              onChange={(e) => update("shareWithFamily", e.target.checked)}
            />
            Allow shared reports to be sent to family
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={s.shareWithCoordinator}
              onChange={(e) => update("shareWithCoordinator", e.target.checked)}
            />
            Allow shared reports to be sent to support coordinator
          </label>
        </div>
        <Field label="Consent notes">
          <textarea
            className="input min-h-[60px]"
            value={s.consentNotes}
            onChange={(e) => update("consentNotes", e.target.value)}
          />
        </Field>
      </Section>

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <a href="/participants" className="btn-ghost">
          Cancel
        </a>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : mode === "create" ? "Create participant" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
