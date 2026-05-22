import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

// Quick links + services mirror the live footer exactly.
const QUICK_LINKS = [
  { label: "Services", href: "#services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Book Now", href: "#booking" },
  { label: "Contact", href: "/contact" },
];

const SERVICE_LINKS = [
  "Gel Manicure",
  "Acrylic Full Set",
  "Nail Art",
  "Spa Pedicure",
  "Nail Repair",
];

export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const href = (h: string) => (h === "/" ? `/${locale}` : `/${locale}${h}`);

  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="font-[var(--font-jost)] text-2xl">
              <span className="font-normal">Pure </span>
              <span className="font-semibold">Nail Bar</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
              Where elegance meets precision in the art of nail care. A serene
              and stylish sanctuary in Vancouver.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-gold">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {QUICK_LINKS.map((item) => (
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
              Services
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {SERVICE_LINKS.map((label) => (
                <li key={label}>
                  <Link
                    href={`/${locale}/services`}
                    className="text-cream/80 hover:text-cream"
                  >
                    {label}
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
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>Designed with ♡ in Vancouver, BC</p>
        </div>
      </div>
    </footer>
  );
}
