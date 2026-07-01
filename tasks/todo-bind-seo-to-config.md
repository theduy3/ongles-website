# Bind SEO builders to resolved config — kill cfg threading

> From `/improve-codebase-architecture` (2026-07-01), Candidate 2 (+ folds #4), grilled.
> Deepening: shrink the call-site interface of the SEO builders so ~20 pages stop
> hand-threading `{ site, locations }` (and `reviewData`) into every call. Keep the
> pure builders intact as the unit-test surface.

## Decision (grilled)

- **Shape (Q1):** (A) per-request **bound surface** — a thin adapter over the still-pure
  `seo.ts` builders. Not currying (B), not self-fetching builders (C — kills purity).
- **Placement + name (Q2):** new server-only module `src/app/[lang]/page-seo.ts`, factory
  `getPageSeo(lang)`. Header draws the line vs `getSeo` (text): `getSeo` = the words,
  `getPageSeo` = the machine-readable emitters bound to resolved config.
- **Coverage (Q3):** (b) cover ALL eight emitters incl. `faq()` passthrough → page files
  drop the `@/lib/seo` import entirely. `organization()` binds `reviewData` internally
  (`reviewDataFor(tenant)`) → **folds Candidate #4** (R-02 caller-assembly leak).
- **Tests (Q4):** `seo.test.ts` survives unchanged (pure builders untouched — primary
  surface). New `page-seo.test.ts` proves the *binding* by deep-equal against the pure
  builders (no mocks; Supabase-absent → getStoreConfig degrades to static config = the
  binding under test) + asserts `organization()` carries reviewData.
- **Scope:** `seo.ts` NOT modified. New `page-seo.ts` + ~20 page edits + `layout.tsx`.

## The surface

```ts
// src/app/[lang]/page-seo.ts  (server-only)
export async function getPageSeo(lang: Locale) {
  const { site, locations } = await getStoreConfig();
  const cfg = { site, locations };
  const reviewData = reviewDataFor(tenant);
  return {
    metadata: (route, opts) => pageMetadata(lang, route, opts, cfg),
    breadcrumb: (crumbs) => breadcrumbGraph(lang, crumbs, cfg),
    service: (item) => serviceGraph(lang, item, cfg),
    services: (items) => servicesGraph(lang, items, cfg),
    pricing: (items) => pricingGraph(lang, items, cfg),
    gallery: (name, images, textFor) => imageGalleryGraph(name, images, textFor, cfg),
    organization: (x) => organizationGraph(lang, x, { ...cfg, reviewData }),
    faq: (items) => faqPageGraph(items),
  };
}
```

## TDD order

1. **RED** `page-seo.test.ts`: `getPageSeo` missing → fail.
2. **GREEN** create `page-seo.ts`; assert `.breadcrumb`/`.metadata`/`.organization` deep-equal
   the pure builders with static cfg; `.organization` carries reviewData.
3. Migrate pages mechanically (per page: drop SEO-only `getStoreConfig`, `const page = await
   getPageSeo(lang)`, swap builder calls to `page.*`, drop `@/lib/seo` import). Pages that
   render `site` fields keep `getStoreConfig` for the body only.
4. Migrate `layout.tsx` `organizationGraph` → `page.organization(...)`; drop `reviewDataFor`
   import + `tenant` if now unused.
5. Verify: `bunx tsc --noEmit` (changed files clean), `bun test src/` green, `bun run build`.

## Folds in

Candidate #4 — `organization()` sources `reviewData` behind the surface; `layout.tsx` stops
assembling it.

## Out of scope

Non-SEO `getStoreConfig` reads (robots, sitemap, manifest, Footer, FloatingCTA, GiftCards,
admin/queue/checkin/clientportal/subscription layouts, api/contact) — legit config reads,
untouched.
