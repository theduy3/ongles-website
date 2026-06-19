---
UI-SPEC
phase: 4
slug: net-new-pages
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-18
---

# Phase 4 — UI Design Contract: Net-New Pages

> Visual and interaction contract for the 3 net-new route types (pricing, comparison/decision, near-me). Authored from the **existing** ongles-website design system — these pages **compose** Phase 1/2/3 primitives (`AnswerBlock`, `Button`, `PageHeader`, `FloatingCTA`, `shadow-card` panels) and introduce **no new visual language**. No design-system tool is initialized; this project uses Tailwind v4 CSS-first tokens declared in `src/app/globals.css` (`@theme`), not shadcn.

**Source of truth read before authoring:** `src/app/globals.css` (`@theme` tokens), `src/components/{AnswerBlock,PageHeader,Button,FloatingCTA}.tsx`, `src/dictionaries/{fr,en}.json` (`cta` block), `.planning/phases/04-net-new-pages/04-CONTEXT.md` (P-01..P-21).

| Field | Value |
|-------|-------|
| Design System Tool | none (Tailwind v4 `@theme`) |
| Preset | none |
| Component library | in-repo `src/components/*` (no external registry) |
| Icon library | inline SVG (no icon package — see `FloatingCTA.tsx`) |
| Display font | Cormorant Garamond (`--font-display`, weight 300) |
| Body font | Jost (`--font-body`, weight 400) |

---

## Spacing Scale

Reuse the established section rhythm — **do not introduce new spacing primitives**. Values are Tailwind defaults already in use across routes.

| Token | Value | Usage in new pages |
|-------|-------|--------------------|
| xs | 4px (`gap-1`) | Inline icon/label gaps |
| sm | 8px (`gap-2`) | Button icon gap, tight inline spacing |
| md | 16px (`mt-4`, `gap-4`) | Default element spacing, card inner gaps |
| lg | 24px (`px-6`, `mt-6`) | Container side padding, lead-paragraph offset |
| xl | 32px (`gap-8`) | Comparison-column gap, card grid gaps |
| 2xl | 48px / 64px | Section breaks |
| Section band | `py-16 md:py-24` | Every top band + major section (matches `PageHeader`/`AnswerBlock`) |
| Container | `mx-auto max-w-6xl px-6` | Every page content wrapper (mandatory) |

---

## Typography

| Role | Spec | Source |
|------|------|--------|
| Page `<h1>` | `text-4xl md:text-6xl text-espresso`, Cormorant, `-0.02em` tracking | carried by `AnswerBlock` (one h1/page — D-19) |
| Section `<h2>` | `text-2xl md:text-3xl text-espresso`, Cormorant | matches existing inner-section headings |
| Sub-head `<h3>` | `text-lg md:text-xl text-espresso` | comparison column titles, pricing intro |
| Body | `text-mocha leading-relaxed`, Jost, `max-w-2xl` for prose | `AnswerBlock`/`PageHeader` prose |
| Labels / eyebrow | `text-sm uppercase tracking-wide text-tan` | table column labels, card meta |

**Rule:** exactly one `<h1>` per new page, always rendered by the leading `AnswerBlock` (carries the answer-first heading). All deeper headings are `<h2>`/`<h3>`.

---

## Color

Palette is fixed (`@theme` in `globals.css`). 60/30/10 discipline:

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Dominant (60%) | `cream` | #faf7f2 | Page background |
| Surface | `white`/`beige` | #ffffff | Cards, pricing panel, comparison columns (`shadow-card`) |
| Band | `sand` | #f0e8dc | `AnswerBlock`/header band only |
| Secondary (30%) | `mocha` | #6b5e52 | Body prose |
| Ink | `espresso` | #2c2824 | Headings, primary button fill |
| Accent (10%) | `gold` | #c9a96e | Price emphasis, single highlighted comparison verdict, phone CTA circle |
| Accent alt | `rose` | #c9907e | Sparingly — one accent max per page if needed |
| Muted | `tan` | #9a8b7a | Eyebrow labels, table column headers, inline links |

**Accent reserve:** `gold`/`rose` never decorate every interactive element. Primary CTAs stay `espresso` solid pills; accent is reserved for **price values** (pricing page) and **one** "recommended" verdict cue (comparison page) at most.

---

## Component Reuse (no net-new components required)

| Need | Reuse | Notes |
|------|-------|-------|
| Answer-first lead + page h1 | `AnswerBlock` ({heading,text,link}) | P-08/P-12/P-16 — used as-is on all 3 page types. A thin variant is allowed ONLY if a page needs a heading distinct from the h1; default is reuse. |
| Buttons / CTAs | `Button` (`solid` primary, `ghost` call) | copy from `dict.cta` (see Copywriting Contract) |
| Floating quick-actions | `FloatingCTA` | inherited from layout — no per-page work |
| Surface panels | `shadow-card` + `rounded-[…]` on white/beige | pricing panel, comparison columns, near-me detail panel |
| Reveal-on-scroll | `Reveal` | optional wrapper for section entrances (used by `PageHeader`) |

---

## Page Layout Contracts

### A. Pricing page (`/tarifs` FR / `/pricing` EN) — PAGE-01

Vertical order (single column, `max-w-6xl px-6`):

1. **`AnswerBlock`** (`sand` band) — answer-first h1 + ≥2-sentence opener: "what do our services cost?" Heading e.g. FR *"Combien coûtent nos services ?"* / EN *"What do our services cost?"*. Optional inline link → `/services`.
2. **Price panel** — one white `shadow-card` panel, `max-w-3xl mx-auto`, containing a **semantic responsive price list**: one row per service.
   - Row = **service name** (links to that service's detail page, `text-espresso hover:text-gold` — cross-link per P-19) on the left; **price range** `price–priceTo` on the right, emphasized in `gold` (`text-gold font-medium`, larger). Use config values only (P-14): pose-ongles $60–75, remplissage $45–60, soins-mains $30–40, soins-pieds $35–60.
   - Rows separated by hairline dividers (`divide-y divide-sand`). Use a real `<table>` **or** a `<dl>`/flex-row list — must be readable by AI extraction and stay legible on mobile (rows stack label-over-value below `sm` if needed; **no horizontal scroll**, P-13 "mobile-friendly").
   - **Price-only** — no duration, no per-row blurb (P-14; deferred items stay out).
3. **Primary CTA row** — one `Button variant="solid"` → `/{locale}/book-online` (copy `dict.cta.book`), centered below the panel. Optional `ghost` call button (`dict.cta.callNow` → `site.contact.phoneHref`).
4. JSON-LD (`ItemList` + per-row `AggregateOffer`) is emitted via existing `src/lib/seo.ts` builders (`servicesGraph` already returns an `ItemList`; `offer()` already returns `AggregateOffer` price ranges) — **no visual surface**, rendered through `<JsonLd>` (planner detail, not a UI element).

### B. Comparison / decision pages (4 pages, shared template) — PAGE-02

Fixed section template (P-09): **`AnswerBlock` → side-by-side → "which to choose" → CTA**.

1. **`AnswerBlock`** (`sand` band) — answer-first h1 stating the verdict in the first sentence (must stand alone if quoted by an AI engine — D-22). ≥200 words total page copy (P-08).
2. **Side-by-side comparison — TWO-COLUMN CARDS, not a data table** (locked discretionary call, P-09). Rationale: the brand is editorial/boutique and card-centric (`SalonCard`, `ReviewCard`); prose-in-cards is more AI-citable than a dense spec table, and stacks cleanly on mobile.
   - Desktop: `grid md:grid-cols-2 gap-8`. Mobile: single column (stacks).
   - Each column = white `shadow-card` panel: `<h2>` option name (e.g. *Gel* / *Acrylique*, *Manucure* / *Pédicure*) → 1–2 sentence descriptor (`text-mocha`) → 3–5 attribute bullets (`<ul>`, plain prose bullets — durability, finish, ideal-for, upkeep). Both columns reflect **real services** (gel AND acrylic both offered — P-06).
3. **"Laquelle choisir ? / Which should you choose?"** — a `<h2>` + decision prose block (`max-w-2xl text-mocha`). At most one `gold` highlight to cue the recommended option. For the "meilleur pour" page (P-07), this section composes **durability + occasion** guidance into one page (occasions → planner discretion).
4. **CTA** — `Button variant="solid"` → `/{locale}/book-online`; contextual cross-links (P-19) to the relevant service detail + `/tarifs` rendered as inline `ghost` links or a small link row.

The 4 pages (P-05): pose-d'ongles vs remplissage, manucure vs pédicure, gel vs acrylique, "meilleur pour" (decision guide). All share this template; only copy differs.

### C. Near-me / neighborhood page (one borough page per tenant) — PAGE-03

Single column, content-led (`max-w-6xl px-6`):

1. **`AnswerBlock`** (`sand` band) — the **≥150-word unique opening copy doubles as the answer block** (P-12). h1 names the **borough/landmark, not the shared city** (Beauport / Charlesbourg / Trois-Rivières — P-10) to avoid cross-tenant cannibalization. <30% cross-tenant sentence overlap (P-11, guard-enforced).
2. **Local details panel** — white `shadow-card`: address + landmark (`getStoreConfig()` NAP), hours, and a compact service list (links to service details — P-19). Reuse the existing locations/NAP presentation tokens; no map embed required this phase.
3. **CTA** — `Button variant="solid"` → `/{locale}/book-online` + `ghost` call (`site.contact.phoneHref`). Cross-link to home/locations (P-19).

This page is an **SEO landing** reached via footer + locations page + contextual cross-links + sitemap — **not** in the header nav (P-04).

---

## Navigation & Cross-Linking (visual)

- **Header nav (P-04):** add **pricing + the 4 comparisons** to `site.routes` → real route entries in `Header.tsx` (currently homepage anchor-links; adding real routes is the change). Near-me page is **footer/contextual only**, never header.
- **Cross-link affordances (P-19):** comparison → service detail + pricing + book; pricing → service detail + book; near-me → home/locations + book; service/home → comparisons + pricing. Render as inline `text-tan underline underline-offset-2 hover:text-espresso` links (the `AnswerBlock` link style) or `ghost` buttons in CTA rows — never as new nav chrome.

---

## Responsive Behavior

| Breakpoint | Pricing | Comparison | Near-me |
|------------|---------|-----------|---------|
| `< sm` (mobile) | rows stack label-over-value, full-width CTA, no h-scroll | columns stack single-file | single column (default) |
| `md+` | two-column rows, centered CTA | `grid-cols-2` columns side-by-side | content column `max-w-2xl` prose, panel `max-w-3xl` |

Container `max-w-6xl px-6` and section `py-16 md:py-24` apply at every breakpoint (matches all existing routes).

---

## Copywriting Contract

| Element | FR | EN | Source |
|---------|----|----|--------|
| Primary CTA | "Réserver en ligne" | "Book Online" | `dict.cta.book` |
| Call CTA | "Appeler pour réserver" | "Call to Book" | `dict.cta.callNow` |
| Cross-link to services | "Voir les services" | "View Services" | `dict.cta.viewServices` |
| Pricing answer heading | "Combien coûtent nos services ?" | "What do our services cost?" | new `seo.{locale}.json` key |
| Comparison decision heading | "Laquelle choisir ?" | "Which should you choose?" | new `seo.{locale}.json` key |

- **Tone:** FR is source-of-truth, **vous** (D-21); native-quality idiomatic EN (D-24). Shared brand voice; per-tenant facts carry uniqueness (D-23).
- **Locale:** fr/en only — no ES scaffolding (D-25 / P-21).
- **Authoring namespace:** all new copy in `seo.{locale}.json` + `dictionaries/{en,fr}.json` only — never legacy `content.{locale}.json` (P-18). `seo-parity.test.ts` extends to every new key.
- **Answer-first invariant:** first sentence of every new page stands alone if an AI engine quotes it (D-22).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | n/a — no shadcn in this project |
| third-party | none | n/a |

No external component registry is used. All UI is in-repo Tailwind v4 + existing `src/components/*`. **No new dependencies.**

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — CTA copy mapped to `dict.cta`; answer-first + locale/namespace rules locked
- [x] Dimension 2 Visuals: PASS — composes existing `AnswerBlock`/`Button`/`shadow-card`; no new primitives
- [x] Dimension 3 Color: PASS — fixed `@theme` palette, 60/30/10, accent reserved for price/verdict
- [x] Dimension 4 Typography: PASS — Cormorant headings / Jost body, one h1/page
- [x] Dimension 5 Spacing: PASS — reuses `max-w-6xl px-6` + `py-16 md:py-24` rhythm
- [x] Dimension 6 Registry Safety: PASS — no external registry, no new deps

**Approval:** authored 2026-06-18 (inline — gsd-ui-researcher/gsd-ui-checker agents not installed in this runtime; grounded directly in the live design system and CONTEXT P-01..P-21).
