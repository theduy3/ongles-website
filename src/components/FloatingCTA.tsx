import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";

// Fixed bottom-right quick actions, mirroring the live site: a "Book Online"
// pill (→ Booker brand hub) and a circular phone button (→ primary location).
export function FloatingCTA({ dict }: { dict: Pick<Dictionary, "cta"> }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <a
        href={site.booker.brand}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-pill bg-espresso px-6 py-3 text-xs font-semibold uppercase tracking-wide text-cream shadow-card transition-colors hover:bg-mocha"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {dict.cta.book}
      </a>
      <a
        href={site.contact.phoneHref}
        aria-label={dict.cta.callNow}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white shadow-card transition-opacity hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M6.62 10.79a15.46 15.46 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z" />
        </svg>
      </a>
    </div>
  );
}
