"use client";

import { useState } from "react";

interface State {
  name: string;
  legalName: string;
  abn: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  primaryColor: string;
  logoUrl: string;
  letterheadHtml: string;
}

export default function BrandingForm({ initial }: { initial: State }) {
  const [s, setS] = useState<State>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setMsg("Branding saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function up<K extends keyof State>(k: K, v: State[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Display name</label>
          <input
            className="input"
            required
            value={s.name}
            onChange={(e) => up("name", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Legal name</label>
          <input
            className="input"
            value={s.legalName}
            onChange={(e) => up("legalName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">ABN</label>
          <input
            className="input"
            value={s.abn}
            onChange={(e) => up("abn", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Primary brand colour</label>
          <input
            className="input"
            value={s.primaryColor}
            onChange={(e) => up("primaryColor", e.target.value)}
            placeholder="#2c8a6f"
          />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input
            type="email"
            className="input"
            value={s.contactEmail}
            onChange={(e) => up("contactEmail", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contact phone</label>
          <input
            className="input"
            value={s.contactPhone}
            onChange={(e) => up("contactPhone", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label">Address</label>
        <input
          className="input"
          value={s.address}
          onChange={(e) => up("address", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Logo URL</label>
        <input
          className="input"
          value={s.logoUrl}
          onChange={(e) => up("logoUrl", e.target.value)}
          placeholder="https://…"
        />
        <p className="text-xs text-ink-500 mt-1">
          Use a hosted image URL. Direct upload will be added later.
        </p>
      </div>
      <div>
        <label className="label">Custom letterhead (HTML, optional)</label>
        <textarea
          className="input min-h-[100px] font-mono text-xs"
          value={s.letterheadHtml}
          onChange={(e) => up("letterheadHtml", e.target.value)}
        />
      </div>

      {msg && (
        <div className="rounded-md bg-emerald-50 text-emerald-700 text-sm px-3 py-2">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {err}
        </div>
      )}

      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save branding"}
        </button>
      </div>
    </form>
  );
}
