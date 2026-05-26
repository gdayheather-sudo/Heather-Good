"use client";

import { useStore } from "@/lib/store";
import { Home, MapPin, MessageCircle, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const { activeUser } = useStore();
  const path = usePathname();

  if (activeUser.role === "admin") return null;

  const items =
    activeUser.role === "companion"
      ? [
          { href: "/home", icon: Home, label: "Home" },
          { href: "/trips/post", icon: Plus, label: "Offer trip" },
          { href: "/profile", icon: User, label: "Profile" },
        ]
      : [
          { href: "/home", icon: Home, label: "Home" },
          { href: "/trips/request", icon: Search, label: "Find a trip" },
          { href: "/profile", icon: User, label: "Profile" },
        ];

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 left-0 right-0 bg-white dark:bg-ink-soft border-t border-ink/10 dark:border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-3 min-h-[60px] text-xs font-semibold ${
                  active
                    ? "text-teal-600 dark:text-amber-300"
                    : "text-ink/70 dark:text-teal-100/70"
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
