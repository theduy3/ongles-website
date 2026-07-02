# ADR 0004 — no page-context fetch factory; extract the locale guard instead

- **Status:** Accepted
- **Date:** 2026-07-01
- **Context module:** Presentation / page routes (see `CONTEXT.md`)

## Context

Every `src/app/[lang]/**/page.tsx` opens with a data-fetch preamble. An
architecture review (`/improve-codebase-architecture`, 2026-07-01, Candidate 2,
"Strong") proposed collapsing it into one deep `getPageContext(lang)` factory
returning `{ dict, seo, page, site, locations, services }`, so a page reads one
call instead of four.

Surveying all ~19 pages showed the preamble is **not uniform**:

- The `getStoreConfig()` destructure varies per page: `{ site }`,
  `{ site, locations }`, `{ site, services }`, `{ site, locations, services }`.
- Four pages (`faq`, `gallery`, `privacy`, `terms`) never call `getStoreConfig`
  at all.
- Some bodies fetch `getSeo`, others don't.
- Single-locale slugs add their own `notFound()` (`/tarifs` FR-only, `/pricing`
  EN-only, `/comparaisons` FR, `/comparisons` EN).
- `appointments` is a pure redirect with no fetch.

The only genuinely uniform, repeated shape across both `generateMetadata` and
the page body is the **locale guard**: `const { lang } = await params;
if (!isLocale(lang)) notFound()` (body) / `return {}` (metadata), plus the
single-locale variants.

## Decision

**Do not build a `getPageContext` (or `getMetadataContext`) fetch factory.
Instead extract the locale guard**: the pure decision `pickLocale`
(`src/app/[lang]/pick-locale.ts`, framework-free) with the `requireLocale` /
`resolveLocale` shells that call `next/navigation` (`locale-guard.ts`).

## Rationale

- **A fat factory fails the deletion test.** Delete `getPageContext` and the
  four fetch lines reappear — but they were never identical (different
  destructures, four pages omit `getStoreConfig`), so complexity does not
  concentrate, it redistributes. Negative locality.
- **It over-fetches.** The resolvers are already memoized
  (`unstable_cache` + React `cache`), so a factory adds no fetches on pages that
  already fetch — but a fetch-everything factory would fire `getStoreConfig`
  (Supabase) on the four lean pages that deliberately avoid it. A behaviour
  change dressed as a refactor.
- **A thin `{ seo, page }` context is shallow.** Its implementation *is*
  `{ seo: await getSeo(lang), page: await getPageSeo(lang) }` — interface ≈
  implementation. Deleting it re-adds two lines. No depth.
- **The guard is the real repeated shape, and it deepens.** `pickLocale` is one
  pure decision behind ~36 call sites; `requireLocale`/`resolveLocale` own the
  `notFound()`-vs-`return {}` framework edge so pages can't drift on what counts
  as a 404. Single-locale pages compose via the `only` arg.
- **Seam discipline.** The guard needs `next/navigation` + the `params` promise,
  so the shells live in an App-Router-coupled file, NOT in the framework-free
  `src/lib/i18n.ts` — the same split as `revalidate-store-caches` (shell) vs
  `cache-tags` (pure owner). `pickLocale` is likewise kept in its own
  `pick-locale.ts` with no `next/navigation` import, so it is unit-testable
  without dragging in the App Router / React-context chain; the thin shells are
  the untested framework edge (cf. ADR 0003).

## Consequences

- `src/app/[lang]/locale-guard.ts` added; pages call `requireLocale` /
  `resolveLocale`. Future architecture reviews should **not** re-suggest a
  `getPageContext` / `getMetadataContext` fetch factory.
- Reopen if the preamble ever becomes genuinely uniform — e.g. every page ends
  up needing the identical resolved-config subset, or a real per-request bundle
  (not just co-fetched cached resolvers) appears. That would change the leverage
  calculus.
