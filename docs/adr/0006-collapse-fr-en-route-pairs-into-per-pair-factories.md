# ADR 0006 — collapse FR/EN route pairs into per-pair route factories

- **Status:** Accepted
- **Date:** 2026-07-02
- **Context module:** Presentation / page routes; Routing (see `CONTEXT.md`)

## Context

Two route *pairs* exist as separate folders because their URL segment is
localized and Next needs a literal path segment per locale:

- `/[lang]/comparaisons/[slug]` (FR) and `/[lang]/comparisons/[slug]` (EN)
- `/[lang]/tarifs` (FR) and `/[lang]/pricing` (EN)

After ADR 0005-era cleanup and the localized-route owner (`src/lib/routes.ts`,
2026-07-02), each pair's two `page.tsx` files were **byte-identical except one
fact** — the locale the folder serves, passed to `resolveLocale`/`requireLocale`
as the wrong-locale guard's `only` arg. A body bug fixed in one file could be
missed in its twin.

## Decision

Collapse each pair into a **per-pair route factory** that binds the one varying
fact:

- `src/app/[lang]/comparison-route.tsx` → `makeComparisonRoute(only: Locale)`
- `src/app/[lang]/pricing-route.tsx` → `makePricingRoute(only: Locale)`

Each returns `{ generateMetadata, Page }`. Each folder's `page.tsx` is a ~8-line
shell that binds its locale and re-exports:

```ts
const route = makeComparisonRoute("fr");
export const generateMetadata = route.generateMetadata;
export default route.Page;
```

## Rationale

- **Passes the deletion test.** Delete a factory and its ~120-line body
  reappears *identically* in two files — complexity concentrates, not
  redistributes. Positive locality.
- **Binds one fact, not a heterogeneous bundle.** The only per-file variable is
  `only: Locale`. The factory is deep (large body, one-arg interface), the shell
  trivial.
- **The one real regression risk is guarded.** A copy-paste leaving both folders
  on the same locale would 404 a whole route silently. A source tripwire
  (`pricing-route-source.test.ts`) asserts each shell binds the correct
  `make*("fr")` / `make*("en")`.
- **Next detects the re-exported `generateMetadata`.** Verified via `next build`
  — a `const` re-export is a named ESM export and is picked up like a function
  declaration.

## Distinction from ADR 0004 (does NOT re-litigate it)

ADR 0004 rejected a `getPageContext(lang)` **cross-page fetch-context factory**
because the ~19 pages' fetch preambles are *not uniform* (varying
`getStoreConfig` destructures, four pages skip it) — so a factory there
redistributes rather than concentrates, and over-fetches.

This is the opposite situation: two **specific pairs** whose *entire bodies* are
identical bar the locale. ADR 0004 itself (lines 22–23) names these single-locale
slug pairs as a distinct case. The factory binds one fact, adds no fetches, and
concentrates a real duplicate. Future reviews should not cite ADR 0004 to revert
this, nor re-suggest merging the two folders into one route (Next needs the
literal localized segments).

## Consequences

- `comparison-route.tsx` / `pricing-route.tsx` added; four `page.tsx` files
  become thin locale-binding shells.
- The factory is the test surface for each pair's body; shells are guarded only
  for correct locale binding.
- Reopen only if a pair gains a genuinely per-folder body difference beyond
  locale — then the shared body no longer fits and the shell should carry it.
