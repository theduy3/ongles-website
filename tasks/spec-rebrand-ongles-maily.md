---
name: rebrand-ongles-maily
status: draft
created-at: 2026-05-22
complexity: large
---

# Spec: Rebrand Pure Nail Bar clone → Ongles Maily (bilingual FR/EN)

## Context

`maily-website` currently ships as a **Pure Nail Bar** clone — a Vancouver/Surrey salon
chain (5 locations, English-only, Booker.com bookings, services
gel-nails/feet/wax/lashes/hair). Convert it into the real site for **Ongles Maily**, a
single nail salon at Carrefour Beauport in Québec City whose live site (onglesmaily.com)
is French-first.

This is a content + configuration rebrand, not an architectural rebuild. The codebase was
**built FR-ready and never switched on**: an orphaned `LocaleSwitch.tsx`, a generic
locale-redirect middleware (`src/proxy.ts`), locale-keyed service slugs
(`Record<Locale, string>`), and `defaultLocale` plumbing throughout. Enabling French is
mostly turning on the locale list and authoring a French dictionary — the biggest effort is
**writing bilingual content**, not wiring.

Source facts crawled from onglesmaily.com (home, /prix, /about, /carte-cadeau) on 2026-05-22.

## Decisions (locked with user)

1. **Bilingual FR + EN**, French as the default locale (Québec business).
2. **Keep the multi-location array structure**; populate only the one Maily location now.
   Sister brands are future-only, NOT built: Ongles Charlesbourg, Ongles Rivières
   (onglesrivieres.com), Ongles Spa Québec (Fall 2026).
3. **Restructure services** to Maily's real menu (replace the 5-service taxonomy).
4. **Full rebrand** — every business fact swaps to Ongles Maily; remove Booker.com.

## Source of truth — Ongles Maily facts

- Name **Ongles Maily**; domain **onglesmaily.com**
- One location: **Carrefour Beauport, 3333 Rue du Carrefour, Entrées 4 ou 5, Québec, QC G1C 5R9**
- Phone **(418) 660-8228**; email **onglesmailyqc@gmail.com**
- Hours: Mon–Wed 9:00–17:30 · Thu–Fri 9:00–21:00 · Sat 9:00–17:00 · Sun 10:00–17:00
- Booking system: `https://moo.wyf.mybluehost.me/website_44873f44/reservation/`
- Gift cards: online via **Square** ("ACHETER EN LIGNE") or in person
- No working FB/IG links — only a Google Business listing
- Price menu: Pose d'Ongles $60 · Remplissage $45 · Soins des mains (vernis inclus) $40 ·
  Vernis mains $30 · Soins des pieds (vernis inclus) $60 · Vernis pieds $35 ·
  Coupe d'ongles d'orteils $20 · Enlève prothèse $20 · Enlève vernis $10–15 ·
  add-ons (designs +$5–25, 3/5 couleurs +$5/$10, faux ongles longs +$5/$10/$15, diamants/ornaments)
- About tone — "POURQUOI NOUS?": hygiene priority (3 disinfection stations, tools disinfected
  after each use, sanitized pedicure stations, dust collectors at manicure stations),
  professional & exceptional service, family atmosphere ("vous êtes notre famille"),
  15+ years experience.

## Scope of changes

Sequenced config/data → dictionaries → locale switch → components → cleanup, so each step is
independently verifiable and `tsc`/build stays green.

### 1. Business config & data
- **`src/lib/site.ts`** — swap all facts: `name`, `url` (`https://onglesmaily.com`), `contact`
  (email/phone/phoneHref/landmark/address → Carrefour Beauport), `hours` (4 blocks), `geo`
  ≈ `{lat:46.8606, lng:-71.1947}` (verify pin). Replace the `booker` object with the Maily
  reservation URL and the Square gift-card URL — keep key name `booker` to avoid touching
  call-sites, or rename to `booking`/`giftCard` and fix the ~7 consumers. Drop dead
  `instagram`/`facebook`/`tiktok` + their `socialProfiles` entries (else schema `sameAs`
  → 404). Prune Pure-only `routes` (`/franchising`, `/pure-parties`, `/press`, `/careers`,
  `/comparisons`).
- **`src/lib/locations.ts`** — replace 5-element array with one `carrefour-beauport` location
  (full Québec address, phone, hours human + `hoursSpec` schema, geo). Repoint each location's
  "Book" to the single reservation URL (rename `bookerServiceMenu()` → `bookingUrl()` or read
  from `site`). Fix hardcoded `"Pure Nail Bar ${loc.name}"` in `mapLink()`.
- **`src/data/google-reviews.json`** — null out Pure's `4.4 / 104` (`fetchedAt: null` already
  gates AggregateRating off) until real reviews exist.
- **`src/app/manifest.ts`** — `name`/`short_name` → Ongles Maily; rewrite description (drop
  "5 Greater Vancouver locations"); `start_url` becomes `/fr` via defaultLocale.
- **`src/app/[lang]/layout.tsx`** — geo region `CA-BC` → `CA-QC`.

### 2. Service registry (`src/lib/services.ts` + assets)
Replace `ServiceId` + array with 4 detail-page services:

```
pose-ongles  slug {fr:"pose-d-ongles",   en:"nail-enhancements"}  price 60 priceTo 75 photo true
remplissage  slug {fr:"remplissage",     en:"fill"}               price 45 priceTo 60 photo false
soins-mains  slug {fr:"soins-des-mains", en:"manicure"}           price 30 priceTo 40 photo true
soins-pieds  slug {fr:"soins-des-pieds", en:"pedicure"}           price 35 priceTo 60 photo true
```

- Add-ons and small items (coupe d'ongles $20, enlève prothèse $20, enlève vernis $10–15)
  fold into each service's `serviceDetails[id].addons[]` / `included[]`. Optionally add a
  `/prix` route mirroring the live price menu.
- Image assets (`public/images/services/<id>.jpg`): no real Maily photos yet — set
  `photo: false` (renders labeled placeholder) where no photo; reuse generic gallery shots
  only where appropriate. Real photos drop in later.

### 3. Dictionaries (`src/dictionaries/`)
- **`en.json`** restructure: rewrite `serviceDetails` for the 4 new ids; resize `services[]`
  to exactly 4 (**index-aligned** with the registry — lengths MUST match); re-theme
  `home.serviceCards`, `giftCards.designs`, all brand/location/meta copy; delete Pure-only
  page keys. This redefines `type Dictionary = typeof en`.
- **`fr.json`** (new): full French translation matching en.json's shape **key-for-key**.
  French is canonical; EN is the translation. Source hygiene/why-us/about copy from the
  onglesmaily.com tone.
- **`src/app/[lang]/dictionaries.ts`** — register `fr: () => import("@/dictionaries/fr.json")`.

### 4. Enable the French locale
- **`src/lib/i18n.ts`** — `locales = ["fr","en"] as const`, `defaultLocale = "fr"`, add
  `localeLabel = { fr:"FR", en:"EN" }`.
- **`src/lib/seo.ts`** — `OG_LOCALE = { fr:"fr_CA", en:"en_CA" }`.
- `src/proxy.ts`, `src/app/sitemap.ts`, `generateStaticParams` iterate `locales` generically
  → auto-cover FR. No middleware change needed.

### 5. Components
- **`Header.tsx`** — render the existing `LocaleSwitch` (desktop + mobile); fix `Wordmark`.
- **`Footer.tsx`** — wordmark, tagline, localize hardcoded `QUICK_LINKS`/`SERVICE_LINKS` via
  dict + new service slugs, kill dead socials, fix "Designed with ♡ in Vancouver, BC".
- **`GiftCards.tsx`** — `"Pure Nail Bar"` tile string → `site.name`, CTA → Square URL,
  re-author `designs` bilingually.
- **`FloatingCTA.tsx`**, **`page.tsx`** (3 CTAs), **`book-online/page.tsx`** — repoint Booker
  links to the Maily reservation URL.
- **`contact/page.tsx`** — replace hardcoded English ("five studios across Greater Vancouver",
  "View all locations") with dict-driven single-location copy.
- **`Testimonials`** — move English placeholder reviews into the dictionary so `/fr` shows
  French (component is currently not locale-aware).

### 6. Cleanup (recommended)
Delete Pure-only routes meaningless for one salon: `franchising`, `pure-parties`, `press`,
`careers`, `comparisons/[slug]` (dirs + dict keys + already-stub `comparisons.ts`). Update
`next.config.ts` stale Booker CSP comments and `env.example`.

## Risks

- **Highest: fr.json shape drift.** `Dictionary = typeof en.json` gives no compile-time guard
  that fr.json matches — a missing key is silent `undefined` at runtime (blank text or `.map`
  crash). Author fr.json by copying en.json structure key-for-key; verify by rendering every
  `/fr/*` route.
- **`dict.services[]` is index-aligned** with the registry — both must be exactly 4 entries.
- **Dead Booker links** across FloatingCTA, home CTAs, book-online, GiftCards, per-location
  menus — all must repoint or 404.
- Default-locale flip to `fr` changes manifest `start_url`, `x-default` hreflang target, and
  proxy fallback to `/fr` (all desired).

## Success criteria / verification

- Dev server starts clean; production build (`output:"standalone"`) compiles.
- Every `/fr/*` and `/en/*` route renders — no blank/`undefined` text, no `.map` crashes.
  `dict.services` has exactly 4 entries in both locales.
- FR↔EN toggle in header works on home, a service detail page (slug differs per locale), and a
  sub-page → URL prefix swaps, `NEXT_LOCALE` cookie set, correct slug resolves, wrong-locale
  slug 404s by design.
- `grep -r "booker\|go.booker.com\|Pure Nail Bar\|purenailbar\|Vancouver" src` returns nothing
  unintended. Every Book / Gift-card CTA lands on Maily reservation / Square.
- `/sitemap.xml` lists `/fr` + `/en` for home + routes + 4 services with reciprocal hreflang
  and `x-default → /fr`; no old slugs.
- `/locations` and `/contact` map iframe shows **Carrefour Beauport**, not Vancouver.
- `/fr` source: `<html lang="fr">`, JSON-LD `inLanguage: "fr_CA"`, geo `CA-QC`, single NailSalon
  node with the 4 hours blocks.

## Out of scope

- Sister salons (Charlesbourg, Rivières, Spa Québec) — array structure stays ready, no data
  added now.
- Real Maily photos and review data — placeholders/null until supplied.
