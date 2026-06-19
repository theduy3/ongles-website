import { getStoreConfig } from "@/lib/store-config";
import { defaultLocale } from "@/lib/i18n";

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

  // ── Comparison slugs (FR + EN) ─────────────────────────────────────────────
  // Hard-coded from comparisons.ts COMPARISONS array — same source of truth,
  // avoids importing a server-lib from a route file. If slugs ever change,
  // this list tracks comparisons.ts (single point of change).
  const comparaisons: Array<{ fr: string; en: string; label: string }> = [
    { fr: "pose-vs-remplissage", en: "nail-extensions-vs-fill", label: "Pose vs remplissage" },
    { fr: "manucure-vs-pedicure", en: "manicure-vs-pedicure", label: "Manucure vs pédicure" },
    { fr: "gel-vs-acrylique", en: "gel-vs-acrylic", label: "Gel vs acrylique" },
    { fr: "meilleur-pour", en: "best-for", label: "Meilleur pour vous" },
  ];

  const frComparaisonLines = comparaisons
    .map((c) => `- [${c.label}](${frBase}/comparaisons/${c.fr})`)
    .join("\n");

  const enComparisonLines = comparaisons
    .map((c) => `- [${c.label}](${enBase}/comparisons/${c.en})`)
    .join("\n");

  // ── Assemble body ──────────────────────────────────────────────────────────
  const body = `# ${site.name}

> ${intro}

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
