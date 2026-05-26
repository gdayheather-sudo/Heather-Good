"use client";

import { useStore } from "@/lib/store";
import { Avatar } from "./ui/Avatar";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function RoleSwitcher() {
  const { users, activeUserId, setActiveUserId, activeUser } = useStore();
  const [open, setOpen] = useState(false);

  const grouped: Record<string, typeof users> = {
    Companions: users.filter((u) => u.role === "companion"),
    Requesters: users.filter((u) => u.role === "requester"),
    Admin: users.filter((u) => u.role === "admin"),
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-white dark:bg-ink-soft border-2 border-ink/10 dark:border-white/10 pl-1 pr-3 py-1 text-sm font-semibold hover:border-teal-500 transition-colors"
        aria-label={`Sign in as. Currently signed in as ${activeUser.name}`}
        aria-expanded={open}
      >
        <Avatar seed={activeUser.id} label={activeUser.name} size={32} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-ink/50 dark:text-teal-100/50">
            Sign in as
          </span>
          <span className="text-sm">{activeUser.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 ml-1" aria-hidden />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-ink-soft shadow-card border-2 border-ink/10 dark:border-white/10 z-40 overflow-hidden"
          >
            {Object.entries(grouped).map(([heading, list]) => (
              <div key={heading} className="py-1">
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ink/50 dark:text-teal-100/50 font-bold">
                  {heading}
                </div>
                {list.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveUserId(u.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 hover:bg-ink/5 dark:hover:bg-white/5 text-left ${
                      u.id === activeUserId ? "bg-teal-50 dark:bg-teal-800/40" : ""
                    }`}
                  >
                    <Avatar seed={u.id} label={u.name} size={28} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">
                        {u.name}
                      </span>
                      <span className="block text-xs text-ink/60 dark:text-teal-100/60">
                        {u.region}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
