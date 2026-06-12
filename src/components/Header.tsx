"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantSite } from "@/config/types";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import { Button } from "./Button";
import { LocaleSwitch } from "./LocaleSwitch";

// Brand logo. A custom uploaded logo (Supabase URL, arbitrary aspect ratio) renders
// as a height-constrained <img> — no next.config remote-domain allowlist needed and
// any ratio scales. The static default keeps next/image optimization.
function Logo({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied remote URL, height-constrained
      <img src={src} alt={name} className="h-10 w-auto sm:h-12" />
    );
  }
  return (
    <Image
      src="/images/logo.png"
      alt={name}
      width={829}
      height={302}
      priority
      className="h-10 w-auto sm:h-12"
    />
  );
}

// Light, translucent sticky header with anchor-scroll nav (single-page design).
export function Header({
  dict,
  locale,
  site,
}: {
  dict: Dictionary;
  locale: Locale;
  site: TenantSite;
}) {
  const [open, setOpen] = useState(false);

  // Anchor hrefs prefixed with the active locale so they scroll from any route.
  const href = (h: string) => (h === "/" ? `/${locale}` : `/${locale}${h}`);

  return (
    <header className="sticky top-0 z-50 border-b border-espresso/10 bg-cream/90 text-espresso backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href={`/${locale}`}
          onClick={() => setOpen(false)}
          aria-label={site.name}
          className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
        >
          <Logo name={site.name} src={site.logo} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {site.nav.map((item) => (
            <Link
              key={item.key}
              href={href(item.href)}
              className="text-[13px] uppercase tracking-[0.12em] text-espresso/80 transition-colors hover:text-espresso"
            >
              {dict.nav[item.key as keyof typeof dict.nav]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <LocaleSwitch locale={locale} />
          <Button href={href(site.booking)} variant="solid">
            {dict.nav.bookOnline}
          </Button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span
            className={`h-0.5 w-6 bg-espresso transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-espresso transition-opacity ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`h-0.5 w-6 bg-espresso transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-espresso/10 lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {site.nav.map((item) => (
                <Link
                  key={item.key}
                  href={href(item.href)}
                  onClick={() => setOpen(false)}
                  className="py-2 text-sm uppercase tracking-[0.12em] text-espresso/80 transition-colors hover:text-espresso"
                >
                  {dict.nav[item.key as keyof typeof dict.nav]}
                </Link>
              ))}
              <Button
                href={href(site.booking)}
                variant="solid"
                className="mt-3 w-full"
              >
                {dict.nav.bookOnline}
              </Button>
              <div className="mt-3 flex justify-end">
                <LocaleSwitch locale={locale} />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
