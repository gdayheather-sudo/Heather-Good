"use client";

import { useState } from "react";

export default function RegisterForm() {
  const [organisationName, setOrganisationName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organisationName, fullName, email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not create account");
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Organisation name</label>
        <input
          required
          value={organisationName}
          onChange={(e) => setOrganisationName(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label">Your full name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
        <p className="text-xs text-ink-500 mt-1">At least 10 characters.</p>
      </div>
      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
