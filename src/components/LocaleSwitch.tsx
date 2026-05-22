"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { locales, localeLabel, type Locale } from "@/lib/i18n";

// EN/FR dropdown. The trigger shows the active locale; opening it reveals the
// full list. Selecting a locale links to the same path in that locale and stores
// the choice in the NEXT_LOCALE cookie so the proxy honours it on later visits
// (manual choice overrides device language).
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const pathFor = (target: Locale) => {
    const rest = pathname.replace(
      new RegExp(`^/(${locales.join("|")})(?=/|$)`),
      "",
    );
    return `/${target}${rest}`;
  };

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative text-sm uppercase tracking-wide">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1.5 font-semibold text-cream transition-colors hover:text-tan"
      >
        {localeLabel[locale]}
        <svg
          viewBox="0 0 12 8"
          aria-hidden
          className={`h-2 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M1 1l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 min-w-[4rem] overflow-hidden rounded-md border border-cream/15 bg-espresso shadow-lg"
        >
          {locales.map((l) => (
            <Link
              key={l}
              href={pathFor(l)}
              role="menuitem"
              aria-current={l === locale ? "true" : undefined}
              onClick={() => {
                document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000`;
                setOpen(false);
              }}
              className={`block px-4 py-2 transition-colors hover:bg-mocha hover:text-cream ${
                l === locale ? "font-semibold text-cream" : "text-cream/60"
              }`}
            >
              {localeLabel[l]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
