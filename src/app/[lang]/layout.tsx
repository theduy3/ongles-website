import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "../globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { getDictionary } from "./dictionaries";
import { getSeo } from "./seo-content";
import { isLocale, dirFor, type LangParams } from "@/lib/i18n";
import { PopupHost } from "@/components/PopupHost";
import { FloatingCTA } from "@/components/FloatingCTA";
import { CustomCodeHost } from "@/components/CustomCodeHost";
import { getStoreConfig } from "@/lib/store-config";
import { organizationGraph } from "@/lib/seo";

// Cormorant Garamond — elegant serif for headings (light/regular weights).
const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

// Jost — clean geometric sans for body copy.
const jost = Jost({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

// Render at runtime so the container's TENANT env selects the active brand.
// No generateStaticParams: static pre-render would pin the build-time tenant into
// the HTML. dynamicParams lets the [lang] segment match en/fr at request time.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: LangParams): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const seo = await getSeo(lang);
  const { site } = await getStoreConfig();
  return {
    // Sitewide base URL — every relative metadata field (canonical, hreflang, og:url,
    // og:image) on every page composes against this. Set once, here.
    metadataBase: new URL(site.url),
    title: seo.meta.homeTitle,
    description: seo.meta.homeDescription,
    robots: { index: true, follow: true },
    // Per-tenant favicon (admin-uploaded, Supabase URL). When unset, omit `icons`
    // so Next falls back to the built-in app/icon.png default (ongles-maily etc.).
    ...(site.favicon ? { icons: { icon: site.favicon } } : {}),
    // Local-SEO geo signals for the primary (Carrefour Beauport) location.
    other: {
      "geo.region": "CA-QC",
      "geo.placename": site.contact.address.city,
      "geo.position": `${site.geo.lat};${site.geo.lng}`,
      ICBM: `${site.geo.lat}, ${site.geo.lng}`,
    },
    // Search-engine ownership verification, read from env so codes never live in
    // source. Set GSC_VERIFICATION / BING_VERIFICATION in the deploy environment.
    // Unset → undefined → Next omits the tag (no empty <meta> emitted).
    verification: {
      google: process.env.GSC_VERIFICATION,
      ...(process.env.BING_VERIFICATION
        ? { other: { "msvalidate.01": process.env.BING_VERIFICATION } }
        : {}),
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LangParams & { children: React.ReactNode }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const seo = await getSeo(lang);
  const { site, locations, customCode } = await getStoreConfig();

  return (
    <html
      lang={lang}
      dir={dirFor(lang)}
      className={`${cormorant.variable} ${jost.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        {/* Sitewide LocalBusiness + WebSite structured data. */}
        <JsonLd
          data={organizationGraph(lang, {
            name: site.name,
            description: seo.org.description,
          }, { site, locations })}
        />
        <Header dict={dict} locale={lang} site={site} />
        {/* pb clears the fixed FloatingCTA so it never covers page content. */}
        <main className="flex-1 pb-28">{children}</main>
        <Footer dict={dict} locale={lang} />
        <FloatingCTA dict={dict} locale={lang} />
        <PopupHost locale={lang} />
        <CustomCodeHost snippets={customCode.filter((s) => s.enabled)} />
      </body>
    </html>
  );
}
