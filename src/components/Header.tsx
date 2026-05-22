"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { Button } from "./Button";

// Instagram glyph. Inherits the link's text colour via currentColor.
function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.22.55.47.94.88 1.35.41.41.8.66 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18a3.64 3.64 0 00-.88-1.35 3.64 3.64 0 00-1.35-.88c-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07zm0 2.76a5.46 5.46 0 110 10.92 5.46 5.46 0 010-10.92zm0 9a3.54 3.54 0 100-7.08 3.54 3.54 0 000 7.08zm6.95-9.22a1.27 1.27 0 11-2.55 0 1.27 1.27 0 012.55 0z" />
    </svg>
  );
}

// Serif wordmark — "Pure" light, "Nail Bar" medium (matches the source logo emphasis).
function Wordmark() {
  return (
    <span className="font-[var(--font-cormorant)] text-2xl tracking-wide text-cream sm:text-3xl">
      <span className="font-light">Pure </span>
      <span className="font-medium">Nail Bar</span>
    </span>
  );
}

// Client Component — holds mobile-menu open state and animates it with Framer Motion.
export function Header({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [open, setOpen] = useState(false);

  // nav hrefs are locale-agnostic base paths; prefix with the active locale.
  const localizedHref = (href: string) =>
    href === "/" ? `/${locale}` : `/${locale}${href}`;

  return (
    <header className="sticky top-0 z-50 bg-espresso text-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={`/${locale}`}
          onClick={() => setOpen(false)}
          aria-label={site.name}
          className="flex items-center"
        >
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {site.nav.map((item) => (
            <Link
              key={item.key}
              href={localizedHref(item.href)}
              className="text-xs uppercase tracking-[0.15em] transition-colors hover:text-tan"
            >
              {dict.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <a
            href={site.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="transition-colors hover:text-tan"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <Button href={localizedHref(site.booking)} variant="light">
            {dict.nav.bookOnline}
          </Button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className={`h-0.5 w-6 bg-cream transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-6 bg-cream transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-6 bg-cream transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-cream/10 lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {site.nav.map((item) => (
                <Link
                  key={item.key}
                  href={localizedHref(item.href)}
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm uppercase tracking-[0.15em] transition-colors hover:text-tan"
                >
                  {dict.nav[item.key]}
                </Link>
              ))}
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="py-2 transition-colors hover:text-tan"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <Button
                href={localizedHref(site.booking)}
                variant="light"
                className="mt-3 w-full"
              >
                {dict.nav.bookOnline}
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
