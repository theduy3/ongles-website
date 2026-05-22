<!-- s1 metadata
task-name: rebrand-ongles-maily
scope: large
status: plan-approved
repo: /Users/theduy/Repo/maily-website
created-at: 2026-05-22
speckit: false
complexity: large
-->

> **Locale strategy:** FR (default) + EN now; **Spanish (`es`) planned for the future.**
> Keep all locale handling generic — never hardcode a 2-locale assumption. Adding `es` later
> must be: append `"es"` to `locales` in `i18n.ts`, add `es.json` (key-parity with en.json),
> add `es` entries to `localeLabel`, `OG_LOCALE`, and every service `slug` map. Authoring depth
> for FR/EN this pass = **full draft both languages** (FR canonical from crawl, EN translation).

# Rebrand Pure Nail Bar → Ongles Maily (bilingual FR/EN) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Convert the Pure Nail Bar clone into the real bilingual (FR-default/EN) site for Ongles Maily — a single Québec City salon — swapping every business fact, restructuring services, and turning on the already-built French locale.

**Architecture:** Content + config rebrand. The codebase is already FR-ready (orphan `LocaleSwitch.tsx`, generic `proxy.ts` locale redirect, `Record<Locale,string>` slugs, `defaultLocale` plumbing). Work bottom-up: business config/data → service registry → EN dictionary → FR dictionary + locale on → components → cleanup → verify. Each phase keeps `tsc`/build green.

**Tech Stack:** Next.js (vendored, `src/app/[lang]/` routing), TypeScript, JSON dictionaries, bun.

**Verification note:** This is a content rebrand — there are no unit tests to write. Verification per task = typecheck/build + targeted grep + route render. Source of truth for all facts/copy = `tasks/spec-rebrand-ongles-maily.md`.

**Decision (locked):** Keep the `site.booker` key name (repoint its values to the Maily reservation + Square gift URLs) rather than rename — avoids churning ~7 call-sites. The key is now a misnomer but holds only URLs; rename is a later cleanup if desired.

---

## Phase A — Business config & data (no UI risk)

### Task 1: Rebrand `src/lib/site.ts`

**Files:**
- Modify: `src/lib/site.ts`

- [ ] **Step 1: Read the file** to confirm current field shapes (`name`, `url`, `booker`, `socialProfiles`, `reviews`, `geo`, `hours`, `contact`, `nav`, `routes`).
- [ ] **Step 2: Swap business facts**
  - `name: "Ongles Maily"`
  - `url: "https://onglesmaily.com"`
  - `booker.brand: "https://moo.wyf.mybluehost.me/website_44873f44/reservation/"`
  - `booker.giftCertificate:` → the Square gift-card URL (the live "ACHETER EN LIGNE" target). If exact Square URL not yet captured, set to the reservation URL as a temporary and leave a one-line `// TODO: confirm Square gift-card URL` — flag in the task summary.
  - Remove `instagram`/`facebook`/`tiktok` fields and any dead entries in `socialProfiles` (leave `socialProfiles` as `[]` or only the Google Business listing URL).
  - `priceRange: "$$"` (unchanged).
  - `reviews`: set `ratingValue`/`reviewCount` to `0`/`0` or remove — real numbers unknown (schema is gated by `google-reviews.json` `fetchedAt`, see Task 3).
  - `geo: { lat: 46.8606, lng: -71.1947 }` (Carrefour Beauport approx — verify pin against Google Maps for `3333 Rue du Carrefour, Québec`).
  - `hours`: replace with 4 blocks:
    `{days:["Mo","Tu","We"],opens:"09:00",closes:"17:30"}`,
    `{days:["Th","Fr"],opens:"09:00",closes:"21:00"}`,
    `{days:["Sa"],opens:"09:00",closes:"17:00"}`,
    `{days:["Su"],opens:"10:00",closes:"17:00"}`.
  - `contact`: `email: "onglesmailyqc@gmail.com"`, `phone: "(418) 660-8228"`, `phoneHref: "tel:+14186608228"`, `landmark: "Carrefour Beauport — Entrées 4 ou 5"`, `address: { line1:"3333 Rue du Carrefour", line2:"Québec, QC G1C 5R9", street:"3333 Rue du Carrefour", city:"Québec", region:"QC", postalCode:"G1C 5R9", country:"CA" }`.
- [ ] **Step 3: Prune Pure-only routes** — remove `/franchising`, `/pure-parties`, `/press`, `/careers`, `/comparisons` (and any `/comparisons/*`) from `routes`. Keep `/services /gallery /locations /about /reviews /faq /contact /book-online /privacy /terms` (+ home).
- [ ] **Step 4: Typecheck** — `bunx tsc --noEmit` (or `bun run typecheck` if defined). Expected: PASS (no call-site breakage since `booker` key kept).
- [ ] **Step 5: Commit** — `git add src/lib/site.ts && git commit -m "feat: rebrand site.ts business facts to Ongles Maily"`

### Task 2: Single location in `src/lib/locations.ts`

**Files:**
- Modify: `src/lib/locations.ts`

- [ ] **Step 1: Read the file** — note the `Location` type, the 5-element array, `bookerServiceMenu()`, `mapEmbedUrl()`, `mapLink()`, `locationBySlug()`.
- [ ] **Step 2: Replace the array** with a single entry:
  - `id: "carrefour-beauport"`, `name: "Ongles Maily — Carrefour Beauport"`, `slug: "carrefour-beauport"`, `landmark: "Carrefour Beauport — Entrées 4 ou 5"`
  - `address`: same fields as site.ts Task 1
  - `phone: "(418) 660-8228"`, `phoneHref: "tel:+14186608228"`
  - `hours` (human-readable rows): `Lun–Mer 9:00–17:30`, `Jeu–Ven 9:00–21:00`, `Sam 9:00–17:00`, `Dim 10:00–17:00` — match the `DayHours` shape (`{label, value}`). (FR labels OK; the location card renders these raw — confirm during Task 9 whether they need localizing.)
  - `hoursSpec`: schema.org `OpeningHoursSpecification` for the same 4 blocks
  - `geo: { lat: 46.8606, lng: -71.1947 }`
  - keep `bookerSlug` field for type-compat but set to `""` (no longer used)
- [ ] **Step 3: Fix booking + brand strings**
  - `bookerServiceMenu(loc)` → return `site.booker.brand` (the single reservation URL), ignoring `loc`. Keep the function name OR rename to `bookingUrl`; if kept, no call-site change needed.
  - In `mapLink()`, replace the hardcoded `"Pure Nail Bar ${loc.name}"` query with `\`${site.name} ${loc.name}\`` (import `site` if not already).
- [ ] **Step 4: Typecheck** — `bunx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/lib/locations.ts && git commit -m "feat: collapse to single Carrefour Beauport location"`

### Task 3: Reviews, manifest, layout geo

**Files:**
- Modify: `src/data/google-reviews.json`, `src/app/manifest.ts`, `src/app/[lang]/layout.tsx`

- [ ] **Step 1:** `google-reviews.json` — set `fetchedAt: null`, `aggregate: { ratingValue: 0, reviewCount: 0, bestRating: 5 }`, `reviews: []`. (Null `fetchedAt` gates the AggregateRating JSON-LD off, so no fake rating ships.)
- [ ] **Step 2:** `manifest.ts` — `name`/`short_name` → `Ongles Maily`; rewrite `description` to a Québec single-salon line (drop "5 Greater Vancouver locations"). Leave colors unless rebranding palette.
- [ ] **Step 3:** `layout.tsx` — change the hardcoded geo region meta from `CA-BC` to `CA-QC`. Confirm city/region pull from `site` where possible.
- [ ] **Step 4: Typecheck + build smoke** — `bunx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/data/google-reviews.json src/app/manifest.ts "src/app/[lang]/layout.tsx" && git commit -m "feat: null reviews, rebrand manifest, geo CA-QC"`

---

## Phase B — Service registry

### Task 4: Rewrite `src/lib/services.ts` + photo flags

**Files:**
- Modify: `src/lib/services.ts`
- Assets: `public/images/services/` (rename/add or rely on placeholders)

- [ ] **Step 1: Read** `src/lib/services.ts` (Service type, ServiceId union, helpers `slugParams`, `serviceBySlug`, `servicePath`, `servicePathsByLocale`) and the detail route `src/app/[lang]/services/[slug]/page.tsx` to confirm how `serviceDetails[id]` is consumed.
- [ ] **Step 2: Replace `ServiceId` + array** with exactly 4 services (order matters — `dict.services[]` is index-aligned in Task 5):

```ts
export type ServiceId = "pose-ongles" | "remplissage" | "soins-mains" | "soins-pieds";

export const services: Service[] = [
  { id: "pose-ongles", slug: { fr: "pose-d-ongles", en: "nail-enhancements" }, price: 60, priceTo: 75, photo: true },
  { id: "remplissage", slug: { fr: "remplissage", en: "fill" }, price: 45, priceTo: 60, photo: false },
  { id: "soins-mains", slug: { fr: "soins-des-mains", en: "manicure" }, price: 30, priceTo: 40, photo: true },
  { id: "soins-pieds", slug: { fr: "soins-des-pieds", en: "pedicure" }, price: 35, priceTo: 60, photo: true },
];
```

- [ ] **Step 3: Service images** — for `photo: true` ids, ensure a file exists at `public/images/services/<id>.jpg` (`pose-ongles.jpg`, `soins-mains.jpg`, `soins-pieds.jpg`). No real Maily photos exist: either copy a reusable generic nail photo from `public/images/gallery/` to those names, OR set `photo: false` so `ServicePhoto` renders its labeled placeholder. Default to placeholders if no suitable generic image. Record which choice you made.
- [ ] **Step 4: Typecheck** — `bunx tsc --noEmit`. Expected: FAIL in `en.json`-derived `Dictionary` usage only if `serviceDetails` ids are stale — that's fixed in Task 5. Compilation of `services.ts` itself should pass. If detail page references old ids, that resolves once Task 5 lands; note any errors to clear by end of Phase C.
- [ ] **Step 5: Commit** — `git add src/lib/services.ts public/images/services && git commit -m "feat: restructure service registry to Maily menu"`

---

## Phase C — English dictionary restructure

### Task 5: Rewrite `src/dictionaries/en.json`

**Files:**
- Modify: `src/dictionaries/en.json`

- [ ] **Step 1: Read** the full `en.json` to map every top-level key (`meta`, `nav`, `cta`, `hero`, `home`, `whyChooseUs`, `giftCards`, `locations`, `newsletter`, `services`, `servicesPage`, `about`, `bookOnline`, `reviews`, `contact`, `form`, `labels`, `serviceDetails`, `serviceLabels`, `faq`, `reviewsPage`, `gallery`, plus Pure-only `careers`/`press`/`pureParties`/`franchising`/`legal`).
- [ ] **Step 2: `serviceDetails`** — replace the 5 old blocks (`gel-nails`/`feet`/`wax`/`lashes`/`hair`) with 4 keyed by the new ids (`pose-ongles`, `remplissage`, `soins-mains`, `soins-pieds`). Each block keeps the existing shape: `{ title, heroAlt, intro[], whyUs, included[], addons[], duration, aftercare, hygiene, faq[{q,a}], metaTitle, metaDescription }`. Author EN copy from the spec's price menu + add-ons + the "POURQUOI NOUS?" hygiene/family tone. `addons[]` must enumerate Maily's real add-ons (designs +$5–25, 3/5 couleurs +$5/$10, faux ongles +$5/$10/$15, diamants/ornaments) and small items (coupe d'ongles $20, enlève prothèse $20, enlève vernis $10–15) where they belong.
- [ ] **Step 3: `services[]`** — resize to exactly 4 entries `{title, body}`, index-aligned with `services.ts` order (pose-ongles, remplissage, soins-mains, soins-pieds).
- [ ] **Step 4: `home.serviceCards`** — re-theme to the 4 Maily services (titles + blurbs). Confirm `CARD_IMAGES` mapping in `src/app/[lang]/page.tsx` still resolves (rename keys/images there in Task 9 if needed).
- [ ] **Step 5: Brand/location/meta copy** — replace every "Pure Nail Bar"/"Vancouver"/"Greater Vancouver"/multi-location phrasing across `meta.*`, `hero`, `home`, `about`, `whyChooseUs`, `locations`, `giftCards.designs`, `reviews`, `contact`, `faq` with Ongles Maily / Carrefour Beauport / single-salon copy. `about` reflects 15+ years experience + family + hygiene stations. `giftCards` references Square purchase.
- [ ] **Step 6: Remove Pure-only keys** — delete `careers`, `press`, `pureParties`, `franchising` blocks (their pages are deleted in Task 10). Keep `legal.terms`/`legal.privacy` but scrub brand/jurisdiction (Québec/Canada).
- [ ] **Step 7: Typecheck** — `bunx tsc --noEmit`. Expected: PASS (this redefines `Dictionary`; old service-id references from Task 4 now resolve).
- [ ] **Step 8: Commit** — `git add src/dictionaries/en.json && git commit -m "feat: restructure EN dictionary for Ongles Maily"`

---

## Phase D — French dictionary + locale activation

### Task 6: Author `src/dictionaries/fr.json` (canonical) + register loader

**Files:**
- Create: `src/dictionaries/fr.json`
- Modify: `src/app/[lang]/dictionaries.ts`

- [ ] **Step 1: Copy structure** — start from the final `en.json` and reproduce its key structure **exactly, key-for-key** (same nesting, same array lengths — `serviceDetails` 4 ids, `services[]` 4 entries). This is the highest-risk step: a missing key is silent runtime `undefined`, not a type error.
- [ ] **Step 2: Translate to French** — French is the canonical content (live site is FR). Use the crawled French verbatim where available: price names (Pose d'Ongles, Remplissage, Soins des mains, Soins des pieds), "POURQUOI NOUS?" hygiene/family copy, gift-card line ("Pour une occasion spéciale ou simplement pour faire plaisir?…"), "Réservez dès maintenant!". Author the rest in natural Québec French.
- [ ] **Step 3: Register** in `dictionaries.ts`: add `fr: () => import("@/dictionaries/fr.json").then(m => m.default)` to the `dictionaries` record.
- [ ] **Step 4: Key-parity check** — verify fr.json and en.json have identical key sets. Use:
  `node -e "const e=require('./src/dictionaries/en.json'),f=require('./src/dictionaries/fr.json');const k=o=>Object.keys(o).flatMap(x=>o[x]&&typeof o[x]==='object'?[x,...k(o[x]).map(y=>x+'.'+y)]:[x]);const ek=new Set(k(e)),fk=new Set(k(f));const miss=[...ek].filter(x=>!fk.has(x)),extra=[...fk].filter(x=>!ek.has(x));console.log('missing in fr:',miss);console.log('extra in fr:',extra);"`
  Expected: both arrays empty. Fix any mismatch before commit.
- [ ] **Step 5: Commit** — `git add src/dictionaries/fr.json "src/app/[lang]/dictionaries.ts" && git commit -m "feat: add French dictionary (canonical) + register loader"`

### Task 7: Turn on the FR locale

**Files:**
- Modify: `src/lib/i18n.ts`, `src/lib/seo.ts`

- [ ] **Step 1:** `i18n.ts` — `export const locales = ["fr", "en"] as const;`, `export const defaultLocale: Locale = "fr";`, add `export const localeLabel: Record<Locale,string> = { fr: "FR", en: "EN" };` (if a label map already exists, extend it).
- [ ] **Step 2:** `seo.ts` — `OG_LOCALE: Record<Locale,string> = { fr: "fr_CA", en: "en_CA" }`.
- [ ] **Step 3: Typecheck + build** — `bunx tsc --noEmit` then `bun run build`. Expected: PASS; `generateStaticParams` now pre-renders `/fr` and `/en`.
- [ ] **Step 4: Smoke routes** — start dev (`bun run dev`), load `/` (should redirect to `/fr`), `/fr`, `/en`. Expected: both render, `/fr` shows French copy.
- [ ] **Step 5: Commit** — `git add src/lib/i18n.ts src/lib/seo.ts && git commit -m "feat: enable French as default locale"`

---

## Phase E — Components

### Task 8: Wire `LocaleSwitch` + Wordmark in Header

**Files:**
- Modify: `src/components/Header.tsx`
- Reference: `src/components/LocaleSwitch.tsx` (already built — do not rewrite)

- [ ] **Step 1: Read** `Header.tsx` and `LocaleSwitch.tsx` to confirm the switch's props/behavior (it writes `NEXT_LOCALE` cookie and rewrites the locale prefix).
- [ ] **Step 2:** Import `LocaleSwitch`; render it in the desktop actions cluster (near Instagram/Book) and inside the mobile menu.
- [ ] **Step 3:** Fix `Wordmark()` — replace the `"Pure "`/`"Nail Bar"` split with `Ongles Maily` (single brand string or styled split that reads "Ongles Maily").
- [ ] **Step 4: Verify in dev** — header shows FR/EN toggle; clicking it swaps the URL prefix and persists across nav. Wordmark reads "Ongles Maily".
- [ ] **Step 5: Commit** — `git add src/components/Header.tsx && git commit -m "feat: wire LocaleSwitch and rebrand Header wordmark"`

### Task 9: Footer, GiftCards, CTAs, contact, testimonials

**Files:**
- Modify: `src/components/Footer.tsx`, `src/components/GiftCards.tsx`, `src/components/FloatingCTA.tsx`, `src/app/[lang]/page.tsx`, `src/app/[lang]/book-online/page.tsx`, `src/app/[lang]/contact/page.tsx`, `src/components/Testimonials.tsx`, `src/data/testimonials.ts`

- [ ] **Step 1: Footer** — fix wordmark; replace tagline ("…sanctuary in Vancouver" → Québec/Maily); drive `QUICK_LINKS`/`SERVICE_LINKS` from the dictionary + new service slugs (or at minimum update labels + slugs and remove links to deleted pages); remove dead FB/TikTok social links (keep Google listing if desired); fix "Designed with ♡ in Vancouver, BC" → Québec.
- [ ] **Step 2: GiftCards** — replace hardcoded `"Pure Nail Bar"` tile string with `site.name`; point CTA at `site.booker.giftCertificate` (Square); ensure `designs` come from the (now bilingual) dictionary.
- [ ] **Step 3: CTA repoints** — `FloatingCTA.tsx`, `page.tsx` (3 booking CTAs), `book-online/page.tsx` — confirm they read `site.booker.brand`/`bookerServiceMenu()` (now the Maily reservation URL). Replace any literal "Booker" text (e.g. book-online "View all locations on Booker") with neutral/localized copy.
- [ ] **Step 4: contact page** — replace hardcoded English literals ("We have five studios across Greater Vancouver", "View all locations") with dict-driven single-location copy.
- [ ] **Step 5: Testimonials** — make placeholder reviews locale-aware: move them into the dictionary (e.g. `dict.reviews.placeholders`) and read from there so `/fr` shows French; OR localize `src/data/testimonials.ts`. Update `Testimonials.tsx` to read the dict fallback.
- [ ] **Step 6: Verify in dev** — visit `/fr` and `/en` for home, contact, gift-cards; no English leaking on `/fr`, no dead links, all CTAs land on Maily reservation/Square.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: rebrand footer/giftcards/CTAs/contact, localize testimonials"`

---

## Phase F — Cleanup

### Task 10: Delete Pure-only routes + stale config

**Files:**
- Delete: `src/app/[lang]/franchising/`, `src/app/[lang]/pure-parties/`, `src/app/[lang]/press/`, `src/app/[lang]/careers/`, `src/app/[lang]/comparisons/`, `src/lib/comparisons.ts` (stub)
- Modify: `next.config.ts`, `env.example` (if present)

- [ ] **Step 1: Confirm** these routes are absent from `site.routes` (done in Task 1) and have no inbound links left (Footer cleaned in Task 9). Grep: `grep -rn "franchising\|pure-parties\|/press\|/careers\|comparisons" src`.
- [ ] **Step 2: Delete** the route directories + `comparisons.ts` + their now-removed dict keys (done in Task 5).
- [ ] **Step 3:** `next.config.ts` — update stale Booker CSP comments; `env.example` — replace Pure example values with Maily.
- [ ] **Step 4: Build** — `bun run build`. Expected: PASS, no orphan-route or missing-import errors.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "chore: remove Pure-only routes and stale config"`

---

## Phase G — Full verification

### Task 11: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Build** — `bun run build` succeeds (`output: "standalone"`).
- [ ] **Step 2: Route walk** — `bun run dev`, then visit every route under both `/fr/*` and `/en/*` (home, services, each of 4 service detail pages, gallery, locations, about, reviews, faq, contact, book-online, privacy, terms). Confirm: no blank/`undefined` text, no `.map` crashes. `dict.services` has exactly 4 entries in both locales.
- [ ] **Step 3: Locale toggle** — switch FR↔EN on home, a service detail page (slug differs per locale: `/fr/services/pose-d-ongles` ↔ `/en/services/nail-enhancements`), and a sub-page. Confirm prefix swap + `NEXT_LOCALE` cookie + correct slug; a wrong-locale slug 404s by design.
- [ ] **Step 4: Dead-link grep** — `grep -rn "booker\|go.booker.com\|Pure Nail Bar\|purenailbar\|Vancouver\|CA-BC" src` returns nothing unintended (the `site.booker` key name is the only allowed "booker" match).
- [ ] **Step 5: CTA click-through** — every Book / Gift-card CTA lands on the Maily reservation URL / Square.
- [ ] **Step 6: Sitemap** — load `/sitemap.xml`; lists `/fr` + `/en` for home + routes + the 4 services with reciprocal hreflang and `x-default → /fr`; no old slugs.
- [ ] **Step 7: Maps** — `/locations` and `/contact` map iframe shows Carrefour Beauport, Québec, not Vancouver.
- [ ] **Step 8: Schema** — `/fr` page source has `<html lang="fr">`, JSON-LD `inLanguage: "fr_CA"`, geo `CA-QC`, a single NailSalon node with the 4 hours blocks; no AggregateRating (gated off).
- [ ] **Step 9: Final commit** if any verification fixes were needed — `git add -A && git commit -m "fix: verification cleanup for Ongles Maily rebrand"`

---

## Self-review notes
- **Spec coverage:** Tasks 1–3 = config/data §1; Task 4 = services §2; Task 5 = EN dict §3; Tasks 6–7 = FR + locale §3/§4; Tasks 8–9 = components §5; Task 10 = cleanup §6; Task 11 = verification.
- **Index-alignment guard:** `services.ts` order (Task 4) and `dict.services[]` (Task 5) and `fr.json services[]` (Task 6) must all be 4 entries, same order.
- **Highest risk:** fr.json key parity (Task 6 Step 4 script gates it) and dead Booker links (Task 11 Step 4 grep gates it).
- **Open item:** exact Square gift-card URL (Task 1) — confirm or flag.
