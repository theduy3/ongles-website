import Link from "next/link";
import { site } from "@/lib/site";
import { services, servicePath } from "@/lib/services";
import { NewsletterForm } from "./NewsletterForm";
import type { Dictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

// Server Component — newsletter form is the only island of interactivity.
export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const href = (h: string) => (h === "/" ? `/${locale}` : `/${locale}${h}`);

  return (
    <footer className="bg-espresso text-cream">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <p className="font-[var(--font-cormorant)] text-3xl">
              <span className="font-light">Pure </span>
              <span className="font-medium">Nail Bar</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
              Where elegance meets precision in the art of nail care. A serene and
              stylish sanctuary in Vancouver.
            </p>
            <div className="mt-6 flex gap-4 text-cream/80">
              <a href={site.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-tan">
                Instagram
              </a>
              <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-tan">
                Facebook
              </a>
              <a href={site.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-tan">
                TikTok
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-tan">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {site.nav
                .filter((i) => i.key !== "home")
                .map((item) => (
                  <li key={item.key}>
                    <Link href={href(item.href)} className="text-cream/80 hover:text-tan">
                      {dict.nav[item.key]}
                    </Link>
                  </li>
                ))}
              <li>
                <Link href={href(site.booking)} className="text-cream/80 hover:text-tan">
                  {dict.nav.bookOnline}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-tan">Services</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {services.map((svc, i) => (
                <li key={svc.id}>
                  <Link
                    href={`/${locale}${servicePath(svc, locale)}`}
                    className="text-cream/80 hover:text-tan"
                  >
                    {dict.services[i].title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stay in touch */}
          <div>
            <h3 className="text-sm uppercase tracking-wide text-tan">
              {dict.newsletter.heading}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              {dict.newsletter.description}
            </p>
            <NewsletterForm dict={dict} />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-cream/10 pt-8 text-xs text-cream/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Designed with ♡ in Vancouver, BC</p>
        </div>
      </div>
    </footer>
  );
}
