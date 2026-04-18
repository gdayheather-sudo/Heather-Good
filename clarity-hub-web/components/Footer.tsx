import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/5 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 sm:grid-cols-3 text-sm">
        <div>
          <h3 className="font-serif text-lg text-navy mb-3">About</h3>
          <p className="text-charcoal/75 max-w-xs">
            The Clarity Hub helps founders turn what&apos;s in their head into
            SOPs, systems, and calm handovers.
          </p>
        </div>

        <div>
          <h3 className="font-serif text-lg text-navy mb-3">Contact</h3>
          <ul className="space-y-1 text-charcoal/75">
            <li>
              <a href="mailto:hello@clarityhub.com.au" className="hover:text-clay">
                hello@clarityhub.com.au
              </a>
            </li>
            <li>Based in Brisbane, Australia</li>
          </ul>
        </div>

        <div>
          <h3 className="font-serif text-lg text-navy mb-3">Elsewhere</h3>
          <ul className="space-y-1 text-charcoal/75">
            <li>
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-clay"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <Link href="/sop-brain-dump" className="hover:text-clay">
                Free SOP Brain Dump
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-charcoal/60">
          <span>© {new Date().getFullYear()} The Clarity Hub</span>
          <span>Made with care in Brisbane</span>
        </div>
      </div>
    </footer>
  );
}
