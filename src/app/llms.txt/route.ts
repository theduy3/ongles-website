import { getStoreConfig } from "@/lib/store-config";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { COMPARISONS, comparisonPath } from "@/lib/comparisons";

// Served at /llms.txt — guides AI crawlers (ChatGPT, Perplexity, Claude, AI
// Overviews) to the canonical FR pages and the core business facts. Generated
// from site config so it stays in sync with the active tenant. See https://llmstxt.org.
//
// Sections (in order, per L-05 FR-canonical-first rule):
//   1. Header — site.name + intro (site.llmsDescription)
//   2. Contact & Location — address, landmark, phone, email
//   3. Hours — opening hours from site.hours
//   4. Services & Pricing (CAD) — generated from services array
//   5. Booking — booking path link
//   6. Key Pages (FR — canonical) — services, tarifs, FAQ, contact, gallery…
//   7. Comparaisons (FR) — 4 buying-guide comparison pages
//   8. Borough near-me page (FR)
//   9. English Equivalents — EN-route mirrors of sections 6–7

export async function GET() {
  const { site, services } = await getStoreConfig();

  // L-02: use canonicalUrl (stable production origin) as the link host, never site.url.
  const frBase = `${site.canonicalUrl}/${defaultLocale}`;
  const enBase = `${site.canonicalUrl}/en`;

  // ── Intro ──────────────────────────────────────────────────────────────────
  // site.llmsDescription is set per-tenant (owner prose, authored in 05-05).
  // Until then it is an empty string; fall back to a minimal derived sentence
  // so the route does not emit an empty blockquote (build remains healthy).
  const intro =
    site.llmsDescription ||
    `${site.name} — salon d'ongles professionnel au ${site.contact.landmark}, ${site.contact.address.city}. Services: pose d'ongles, remplissage, soins des mains et soins des pieds. ${site.contact.phone}.`;

  // ── Hours ──────────────────────────────────────────────────────────────────
  const hoursLines = site.hours
    .map((h) => `- ${h.days.join("/")} ${h.opens}–${h.closes}`)
    .join("\n");

  // ── Services & Pricing ────────────────────────────────────────────────────
  const serviceLines = services
    .map((s) => {
      const priceRange =
        s.priceTo != null ? `$${s.price}–$${s.priceTo} CAD` : `$${s.price} CAD`;
      return `- ${s.id}: ${priceRange}`;
    })
    .join("\n");

  // ── Near-me borough slug ───────────────────────────────────────────────────
  // The last entry in site.routes is the borough near-me landing page:
  //   ongles-maily       → /beauport
  //   ongles-charlesbourg → /charlesbourg
  //   ongles-rivieres    → /trois-rivieres
  const nearMeRoute = site.routes.at(-1) ?? "";

  // ── Comparison links (FR + EN) ─────────────────────────────────────────────
  // Derived from the COMPARISONS registry — the single source for slug, locale
  // path, and label. comparisonPath() owns the /comparaisons vs /comparisons
  // folder mapping and the per-locale label prevents the EN list from falling
  // back to FR text.
  const comparisonLines = (lang: Locale, base: string) =>
    COMPARISONS.map(
      (c) => `- [${c.label[lang]}](${base}${comparisonPath(c, lang)})`,
    ).join("\n");

  const frComparaisonLines = comparisonLines(defaultLocale, frBase);
  const enComparisonLines = comparisonLines("en", enBase);

  // ── Freshness line ──────────────────────────────────────────────────────────
  // BUILD_TIMESTAMP is inlined by next.config `env` at build time; each Dokploy
  // deploy is a fresh build, so this tracks the last publish. Date-only (YYYY-MM-DD)
  // is enough signal for AI crawlers. Omitted when unbuilt (no fabricated date).
  const updated = process.env.BUILD_TIMESTAMP?.slice(0, 10);
  const updatedLine = updated ? `\n_Last updated: ${updated}_\n` : "";

  // ── Assemble body ──────────────────────────────────────────────────────────
  const body = `# ${site.name}

> ${intro}
${updatedLine}
## Contact & Location

- Address: ${site.contact.address.line1}, ${site.contact.address.line2}
- Landmark: ${site.contact.landmark}
- Phone: ${site.contact.phone}
- Email: ${site.contact.email}
- Languages: Français (canonical), English

## Hours

${hoursLines}

## Services & Pricing (CAD)

${serviceLines}

## Booking

- Book online: [${frBase}${site.booking}](${frBase}${site.booking})

## Key Pages (FR — canonical)

- [Services](${frBase}/services): tarifs et détails des soins
- [Tarifs](${frBase}/tarifs): grille tarifaire complète
- [Gallery](${frBase}/gallery): photos d'ongles et travaux récents
- [Reviews](${frBase}/reviews): témoignages clients
- [FAQ](${frBase}/faq): heures, réservation, services et hygiène
- [Contact](${frBase}/contact): adresse, itinéraire et formulaire
- [À propos](${frBase}/about): philosophie hygiène et 15+ ans d'expérience

## Comparaisons (FR)

${frComparaisonLines}

## Quartier (FR)

- [Salon près de moi](${frBase}${nearMeRoute}): salon d'ongles à proximité

## English Equivalents

- [Services](${enBase}/services): pricing and service details
- [Pricing](${enBase}/pricing): full price list
- [Gallery](${enBase}/gallery): nail art and recent work
- [Reviews](${enBase}/reviews): client testimonials
- [FAQ](${enBase}/faq): hours, booking, services and hygiene
- [Contact](${enBase}/contact): address, directions and message form
- [About](${enBase}/about): hygiene-first philosophy and 15+ years of experience

### Comparisons (EN)

${enComparisonLines}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
