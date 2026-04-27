"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Role } from "@prisma/client";

interface Item {
  href: string;
  label: string;
  roles: Role[];
}

const ITEMS: Item[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["SUPPORT_WORKER", "TEAM_LEAD", "ADMIN"] as Role[],
  },
  {
    href: "/participants",
    label: "Participants",
    roles: ["SUPPORT_WORKER", "TEAM_LEAD", "ADMIN"] as Role[],
  },
  {
    href: "/case-notes",
    label: "Case notes",
    roles: ["SUPPORT_WORKER", "TEAM_LEAD", "ADMIN"] as Role[],
  },
  {
    href: "/reports",
    label: "Reports",
    roles: ["TEAM_LEAD", "ADMIN"] as Role[],
  },
  {
    href: "/admin/users",
    label: "Users",
    roles: ["ADMIN"] as Role[],
  },
  {
    href: "/admin/branding",
    label: "Branding",
    roles: ["ADMIN"] as Role[],
  },
];

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => i.roles.includes(role));
  return (
    <aside className="w-60 shrink-0 border-r border-ink-200 bg-white min-h-screen">
      <div className="px-5 py-5 border-b border-ink-100">
        <Link href="/dashboard" className="block">
          <div className="text-brand-700 font-semibold tracking-tight">
            NDIS Clarity Layer
          </div>
          <div className="text-xs text-ink-500">Intelligence layer</div>
        </Link>
      </div>
      <nav className="p-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-brand-50 text-brand-800 font-medium"
                  : "text-ink-700 hover:bg-ink-100",
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
