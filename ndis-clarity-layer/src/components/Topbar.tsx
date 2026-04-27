"use client";

import { Role } from "@prisma/client";
import { ROLE_LABEL } from "@/lib/rbac";

export default function Topbar({
  fullName,
  role,
  organisationName,
}: {
  fullName: string;
  role: Role;
  organisationName: string;
}) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <header className="h-14 border-b border-ink-200 bg-white flex items-center justify-between px-6">
      <div className="text-sm text-ink-500">{organisationName}</div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm leading-tight">
          <div className="text-ink-800 font-medium">{fullName}</div>
          <div className="text-ink-500 text-xs">{ROLE_LABEL[role]}</div>
        </div>
        <button onClick={logout} className="btn-outline">
          Sign out
        </button>
      </div>
    </header>
  );
}
