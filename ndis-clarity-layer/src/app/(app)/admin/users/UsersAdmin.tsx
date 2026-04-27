"use client";

import { useState } from "react";
import { Role } from "@prisma/client";

interface U {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  roleLabel: string;
}

const ROLES: Role[] = [
  Role.SUPPORT_WORKER,
  Role.TEAM_LEAD,
  Role.ADMIN,
  Role.EXTERNAL_VIEWER,
];

export default function UsersAdmin({
  initial,
  currentUserId,
}: {
  initial: U[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<U[]>(initial);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.SUPPORT_WORKER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      const j = await res.json();
      setUsers([
        {
          id: j.id,
          fullName,
          email,
          role,
          isActive: true,
          roleLabel: role,
        },
        ...users,
      ]);
      setFullName("");
      setEmail("");
      setPassword("");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function update(u: U, patch: Partial<U>) {
    setError(null);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Update failed");
      return;
    }
    setUsers(users.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="btn-primary"
          onClick={() => setShowAdd((s) => !s)}
        >
          {showAdd ? "Close" : "Invite member"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input
              className="input"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="card divide-y divide-ink-100">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-4 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-medium">
                {u.fullName}
                {u.id === currentUserId && (
                  <span className="ml-2 text-xs text-brand-700">(you)</span>
                )}
              </div>
              <div className="text-xs text-ink-500">{u.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input !w-auto py-1.5"
                value={u.role}
                disabled={u.id === currentUserId}
                onChange={(e) => update(u, { role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
              <button
                className={u.isActive ? "btn-outline" : "btn-primary"}
                disabled={u.id === currentUserId}
                onClick={() => update(u, { isActive: !u.isActive })}
              >
                {u.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
