import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ideas", label: "Ideas" },
  { href: "/new", label: "New seed" },
  { href: "/settings", label: "Settings" },
];

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-serif text-lg text-navy">
            Clarity CRM
          </Link>
          <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        {user && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden md:inline">{user.email}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
