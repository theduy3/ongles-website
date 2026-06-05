import Link from "next/link";
import { getStoreConfig } from "@/lib/store-config";
import { NewsletterForm } from "./NewsletterForm";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export async function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { site, services } = await getStoreConfig();
  const href = (h: string) => (h === "/" ? `/${locale}` : `/${locale}${h}`);

  // Quick links — only routes that exist in this project.
  const quickLinks = [
    { label: dict.nav.services, href: "/services" },
    { label: dict.nav.gallery, href: "/gallery" },
    { label: dict.nav.reviews, href: "/reviews" },
    { label: dict.nav.about, href: "/about" },
    { label: dict.nav.locations, href: "/locations" },
    { label: dict.nav.faq, href: "/faq" },
    { label: dict.nav.contact, href: "/contact" },
    { label: dict.nav.bookOnline, href: "/book-online" },
  ];

  // Service links built from the canonical registry + active-locale slugs.
  const serviceLinks = services.map((s, i) => ({
    label: dict.home.serviceCards[i]?.title ?? s.id,
    href: `/${locale}/services/${s.slug[locale]}`,
  }));

  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-[var(--font-jost)] text-2xl">
              <span className="font-normal">Ongles </span>
              <span className="font-semibold">Maily</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
              {dict.hero.subtitle}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gold">
              {locale === "fr" ? "Liens rapides" : "Quick Links"}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={href(item.href)}
                    className="text-cream/80 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gold">
              {dict.nav.services}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {serviceLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-cream/80 hover:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stay in touch */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gold">
              {dict.newsletter.heading}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              {dict.newsletter.description}
            </p>
            <NewsletterForm dict={dict} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-2 border-t border-cream/10 pt-8 text-xs text-cream/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}.{" "}
            {locale === "fr" ? "Tous droits réservés." : "All rights reserved."}
          </p>
          <nav className="flex gap-4">
            <Link href={href("/terms")} className="hover:text-cream">
              {dict.nav.terms}
            </Link>
            <Link href={href("/privacy")} className="hover:text-cream">
              {dict.nav.privacy}
            </Link>
          </nav>
          <p>
            {locale === "fr"
              ? "Conçu avec ♡ à Québec"
              : "Designed with ♡ in Québec"}
          </p>
        </div>
      </div>
    </footer>
  );
}
