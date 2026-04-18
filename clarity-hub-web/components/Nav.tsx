import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/sop-brain-dump", label: "Free SOP Brain Dump" },
];

export default function Nav() {
  return (
    <header className="w-full border-b border-black/5">
      <nav
        aria-label="Primary"
        className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5"
      >
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-navy"
          aria-label="The Clarity Hub home"
        >
          The Clarity Hub
        </Link>

        <ul className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-charcoal/80 hover:text-clay transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
