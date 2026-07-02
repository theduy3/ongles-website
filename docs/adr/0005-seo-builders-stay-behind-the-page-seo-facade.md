# ADR 0005 — SEO builders stay one module behind the page-seo facade

- **Status:** Accepted
- **Date:** 2026-07-01
- **Context module:** Presentation / SEO emitters (see `CONTEXT.md`)

## Context

`src/lib/seo.ts` is 505 lines and exports nine functions: `pageMetadata`, the
JSON-LD builders (`organizationGraph`, `servicesGraph`, `serviceGraph`,
`pricingGraph`, `faqPageGraph`, `imageGalleryGraph`, `breadcrumbGraph`), and
`reviewSchemaFragment`.

An architecture review (`/improve-codebase-architecture`, 2026-07-01,
Candidate 4, "Worth exploring") proposed splitting it into single-purpose
modules (`seo-metadata.ts`, `seo-graph-local.ts`, `seo-graph-org.ts`), arguing
"a page needing one builder loads all seven" and that builders are hard to test
in isolation.

Exploration showed both premises are false:

- **No page imports `seo.ts`.** `getPageSeo()` in `src/app/[lang]/page-seo.ts`
  is a facade that binds every builder to the request's resolved config
  (`site`, `locations`) and the tenant's R-02 `reviewData`. Pages call
  `page.metadata(...)` / `page.breadcrumb(...)`; the facade is the sole runtime
  consumer, and it needs all of the builders. There is no "caller loads too
  much" — the interface pages see is the facade, not `seo.ts`.
- **The builders are already pure and unit-tested** through `seo.test.ts`,
  `page-seo.test.ts`, `review-schema-fragment.test.ts`, and
  `reviews-r02-gate.test.ts`. Testability is not blocked by the file's size.

## Decision

**Keep the SEO builders in one `seo.ts` module. Do not split it.**

## Rationale

- **The deep seam already exists — it is the facade.** Depth is a property of
  the interface. `getPageSeo()` is the small interface hiding a large
  implementation; `seo.ts` is that implementation. Splitting the implementation
  file changes no interface and adds no depth.
- **Deletion test is neutral.** Splitting relocates builders across three files
  plus a new shared-kernel module (`OG_LOCALE`, `OG_IMAGE`, `buildTimestamp`,
  `offer`, `SeoConfig` / `OrgGraphConfig`). Complexity moves between files; it
  does not concentrate. No leverage is bought — the facade still imports every
  builder.
- **No leverage to buy it back.** One runtime caller (the facade), a fixed set
  of builders, all already tested. A split serves navigation preference, not a
  varying seam or an over-importing caller.
- **Cohesion and the size ceiling.** `seo.ts` is one concern (SEO emission),
  linear, and sectioned with comment headers; 505 lines is over the 200–400
  "typical" guidance but under the 800 ceiling. Grepping a builder name lands on
  it directly, so AI-navigability is not materially impaired.
- **Simplicity first.** Fragmenting cohesive, tested code into a kernel + three
  files for zero leverage is the over-abstraction the project's rules guard
  against — the same reasoning as ADR 0001 and 0002.

## Consequences

- `src/lib/seo.ts` stays as one module fronted by the `page-seo.ts` facade.
  Future architecture reviews should not re-suggest splitting it on
  file-size or "callers over-import" grounds.
- Reopen if a **second, non-facade** runtime consumer appears that needs only a
  subset of the builders (a real over-import), or if a builder cluster grows a
  genuinely independent seam (e.g. a distinct varying adapter). Either would
  change the leverage calculus. A pure line-count concern does not.
