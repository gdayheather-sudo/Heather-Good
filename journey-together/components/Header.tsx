"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useStore } from "@/lib/store";
import { RoleSwitcher } from "./RoleSwitcher";

export function Header({ adminWide = false }: { adminWide?: boolean }) {
  const { dark, toggleDark } = useStore();
  return (
    <header
      className={
        adminWide
          ? "w-full bg-ink text-teal-50 border-b border-white/10"
          : "w-full bg-ink text-teal-50"
      }
    >
      <div
        className={
          adminWide
            ? "mx-auto max-w-7xl px-6 py-3 flex items-center gap-4"
            : "px-4 py-3 flex items-center gap-3"
        }
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight text-lg focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg"
        >
          <span aria-hidden className="text-amber-400">◆</span>
          <span>Journey Together</span>
        </Link>
        <span className="ml-auto" />
        <button
          type="button"
          onClick={toggleDark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <RoleSwitcher />
      </div>
    </header>
  );
}
