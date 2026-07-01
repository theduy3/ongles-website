# Required SEO Config (C03) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the silent-stale-default footgun in the remaining 6 SEO builders (matching C01's fix to `organizationGraph`) — make `cfg: SeoConfig` a required param everywhere, turning "forgot to pass live config" from a silent runtime bug into a compile error. This also fixes a REAL live bug: 4 pages (`faq`, `gallery`, `privacy`, `terms`) currently render `<title>`/OG tags/breadcrumbs from the static build-time `site.name`, never the admin-editable live override — so a salon rename via `/admin/settings` silently leaves these 4 pages stale while every other page updates.

**Architecture:** Drop the `cfg: SeoConfig = { site, locations }` default from 5 builders (`pageMetadata`, `servicesGraph`, `serviceGraph`, `imageGalleryGraph`, `breadcrumbGraph`) and the `cfg?: SeoConfig` optional marker from `pricingGraph` (a thin delegate to `servicesGraph`). `faqPageGraph` is untouched (no `site`/`locations` dependency). The 4 broken pages get the exact `getStoreConfig()` + explicit-cfg pattern already used by the other 15 pages — no new abstraction. TypeScript (via `bun run build`, already a required deploy gate) is the regression test; no new runtime tests.

**Tech Stack:** TypeScript, Next.js App Router, `bun:test`.

---

## Background — read first

Confirmed via full-repo grep (no page missed):
- **19 files** call `pageMetadata`/`breadcrumbGraph`/etc. **15 already** fetch `getStoreConfig()` and pass `{ site, locations }` explicitly to every builder call (both in `generateMetadata` and the component body) — e.g. `src/app/[lang]/contact/page.tsx`. These need **zero changes**.
- **4 files do not**: `src/app/[lang]/faq/page.tsx`, `src/app/[lang]/gallery/page.tsx`, `src/app/[lang]/privacy/page.tsx`, `src/app/[lang]/terms/page.tsx`. They call `pageMetadata(...)`/`breadcrumbGraph(...)` (and `gallery` also `imageGalleryGraph(...)`) with **no cfg arg at all**, relying entirely on the static default. `site.name` is admin-editable (`SiteSectionSchema.name` in `src/lib/store-settings-schema.ts`) — so a rename via the admin UI leaves these 4 pages showing the old name while all 15 others update. This is the concrete bug being fixed.
- `schema-invariants.test.ts` (alias-free-constrained) already passes `cfg` explicitly to `servicesGraph`/`serviceGraph` — **no changes needed** there.
- `seo.test.ts` has ONE test that explicitly relies on the old default-value design: `"uses static site.name when no cfg is passed"` (the `pageMetadata` describe block) — this must be updated, mirroring how C01 handled the equivalent `organizationGraph` test.
- After dropping all 5 defaults, the module-level `import { site } from "@/lib/site";` becomes **fully unused** (its only use was as a default value) and must be deleted. `import { locations, mapLink } from "@/lib/locations";` narrows to `import { mapLink } from "@/lib/locations";` (`mapLink` is genuinely used elsewhere; bare `locations` is not, once defaults are gone).

Current builder signatures (`src/lib/seo.ts`):
```ts
// line 170
cfg: SeoConfig = { site, locations },   // pageMetadata
// line 236 — already required (C01)
cfg: OrgGraphConfig,                     // organizationGraph
// line 372
cfg: SeoConfig = { site, locations },   // servicesGraph
// line 396
cfg: SeoConfig = { site, locations },   // serviceGraph
// line 426
cfg?: SeoConfig,                         // pricingGraph (delegates to servicesGraph)
// line 452
cfg: SeoConfig = { site, locations },   // imageGalleryGraph
// line 474
cfg: SeoConfig = { site, locations },   // breadcrumbGraph
```
(`faqPageGraph` has no `cfg` param — untouched.)

---

## Task 1: Make the 6 builders require `cfg`

**Files:**
- Modify: `src/lib/seo.ts`

- [ ] **Step 1: Remove the now-unused `site` import; narrow the `locations` import**

Find:
```ts
import { site } from "@/lib/site";
import { locations, mapLink } from "@/lib/locations";
```
Replace with:
```ts
import { mapLink } from "@/lib/locations";
```

- [ ] **Step 2: Drop the default on `pageMetadata`**

Find (around line 170):
```ts
  cfg: SeoConfig = { site, locations },
): Metadata {
```
Replace with:
```ts
  cfg: SeoConfig,
): Metadata {
```
(This is inside `pageMetadata`'s parameter list — verify by context, it's the function whose body builds `Metadata` with `alternates`/`openGraph`/`twitter`.)

- [ ] **Step 3: Drop the default on `servicesGraph`**

Find (around line 372):
```ts
  cfg: SeoConfig = { site, locations },
): WithContext<ItemList> {
```
Replace with:
```ts
  cfg: SeoConfig,
): WithContext<ItemList> {
```
(Verify by context — the function building the `ItemList` graph with `itemListElement: items.map(...)`.)

- [ ] **Step 4: Drop the default on `serviceGraph`**

Find (around line 396):
```ts
  cfg: SeoConfig = { site, locations },
): WithContext<SchemaService> {
```
Replace with:
```ts
  cfg: SeoConfig,
): WithContext<SchemaService> {
```

- [ ] **Step 5: Make `pricingGraph`'s `cfg` required (drop the `?`)**

Find (around line 413-429):
```ts
/**
 * Pricing hub graph — named entry point for the /tarifs page (Phase 4).
 *
 * Delegates to servicesGraph() unchanged so every Phase 2 offer() invariant
 * (AggregateOffer when priceTo > price, Offer otherwise — SCHEMA-02) is
 * preserved without duplicating logic. Phase 2 builders are untouched (D-28).
 *
 * @param lang - Locale ("fr" | "en")
 * @param items - Services to list on the pricing page
 * @param cfg - Optional SeoConfig (defaults to module-level site/locations)
 */
export function pricingGraph(
  lang: Locale,
  items: readonly ServiceItem[],
  cfg?: SeoConfig,
): WithContext<ItemList> {
  return servicesGraph(lang, items, cfg);
}
```
Replace with:
```ts
/**
 * Pricing hub graph — named entry point for the /tarifs page (Phase 4).
 *
 * Delegates to servicesGraph() unchanged so every Phase 2 offer() invariant
 * (AggregateOffer when priceTo > price, Offer otherwise — SCHEMA-02) is
 * preserved without duplicating logic. Phase 2 builders are untouched (D-28).
 *
 * @param lang - Locale ("fr" | "en")
 * @param items - Services to list on the pricing page
 * @param cfg - The resolved request-time config (required — see servicesGraph)
 */
export function pricingGraph(
  lang: Locale,
  items: readonly ServiceItem[],
  cfg: SeoConfig,
): WithContext<ItemList> {
  return servicesGraph(lang, items, cfg);
}
```

- [ ] **Step 6: Drop the default on `imageGalleryGraph`**

Find (around line 452):
```ts
  cfg: SeoConfig = { site, locations },
): WithContext<ImageGallery> {
```
Replace with:
```ts
  cfg: SeoConfig,
): WithContext<ImageGallery> {
```

- [ ] **Step 7: Drop the default on `breadcrumbGraph`**

Find (around line 474):
```ts
  cfg: SeoConfig = { site, locations },
): WithContext<BreadcrumbList> {
```
Replace with:
```ts
  cfg: SeoConfig,
): WithContext<BreadcrumbList> {
```

- [ ] **Step 8: Confirm no other `= { site, locations }` default remains**

Run: `grep -n "= { site, locations }\|cfg?: SeoConfig" src/lib/seo.ts`
Expected: NO output (only `organizationGraph`'s already-required `OrgGraphConfig` and `faqPageGraph`'s cfg-less signature remain).

- [ ] **Step 9: Confirm this compiles in isolation is NOT expected yet — callers aren't fixed**

This step is informational only, do not attempt a fix: run `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "seo\.test\.ts|faq/page\.tsx|gallery/page\.tsx|privacy/page\.tsx|terms/page\.tsx"`. Expected: several errors — these are the exact call sites Tasks 2 and 3 fix. Report the list of errors found (do not fix them in this task).

- [ ] **Step 10: Commit**

```bash
git add src/lib/seo.ts
git commit -m "refactor(seo): require cfg on all SEO builders (matches organizationGraph's C01 fix)"
```

---

## Task 2: Fix `seo.test.ts`'s stale "no cfg passed" test

**Files:**
- Modify: `src/lib/seo.test.ts`

- [ ] **Step 1: Update the test**

Find (around line 194-219):
```ts
describe("pageMetadata — dependency injection", () => {
  it("uses static site.name when no cfg is passed", () => {
    // WHY: Backward-compat — existing callers pass no cfg and must keep working.
    const meta = pageMetadata("fr", "/test", {
      title: "T",
      description: "D",
    });
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      staticSite.name,
    );
  });

  it("uses injected site.name in openGraph.siteName", () => {
    // WHY: openGraph.siteName is the social-share brand name; it must reflect
    // the runtime config override so tenant-specific OG data is correct.
    const meta = pageMetadata(
      "fr",
      "/test",
      { title: "T", description: "D" },
      injectedCfg,
    );
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      "Injected Salon Name",
    );
  });
});
```
Replace the first test with (cfg is now required — no page can omit it; this test now proves passing the STATIC site explicitly still works, i.e. no builder-side regression):
```ts
describe("pageMetadata — dependency injection", () => {
  it("uses site.name from an explicitly-passed static cfg", () => {
    // cfg is now required (no default) — every caller must resolve and pass
    // live config explicitly. This proves passing the static site verbatim
    // still produces the expected shape (no builder-side regression).
    const meta = pageMetadata(
      "fr",
      "/test",
      { title: "T", description: "D" },
      { site: staticSite, locations: staticLocations },
    );
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      staticSite.name,
    );
  });

  it("uses injected site.name in openGraph.siteName", () => {
    // WHY: openGraph.siteName is the social-share brand name; it must reflect
    // the runtime config override so tenant-specific OG data is correct.
    const meta = pageMetadata(
      "fr",
      "/test",
      { title: "T", description: "D" },
      injectedCfg,
    );
    expect((meta.openGraph as { siteName?: string })?.siteName).toBe(
      "Injected Salon Name",
    );
  });
});
```
Check the top of `seo.test.ts` for how `staticSite`/`staticLocations` (or equivalently-named imports) are already imported (they're used elsewhere in the file, e.g. by `injectedCfg`'s construction) — reuse the EXACT existing import names; do not introduce new aliases if `staticSite`/`staticLocations` aren't already the names used.

- [ ] **Step 2: Run the file's tests**

Run: `bun test src/lib/seo.test.ts`
Expected: PASS. Report the count.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seo.test.ts
git commit -m "test(seo): update pageMetadata test for required cfg (no more default-value backward-compat)"
```

---

## Task 3: Fix the 4 pages that were silently using the stale static default

**Files:**
- Modify: `src/app/[lang]/faq/page.tsx`
- Modify: `src/app/[lang]/gallery/page.tsx`
- Modify: `src/app/[lang]/privacy/page.tsx`
- Modify: `src/app/[lang]/terms/page.tsx`

Apply the EXACT pattern already used by the other 15 pages (e.g. `src/app/[lang]/contact/page.tsx`, `src/app/[lang]/about/page.tsx`): import `getStoreConfig`, call it once in `generateMetadata` and once in the page component, destructure `{ site, locations }`, and pass `{ site, locations }` as the last arg to every builder call.

- [ ] **Step 1: Read each of the 4 files in full before editing**

Read `src/app/[lang]/faq/page.tsx`, `src/app/[lang]/gallery/page.tsx`, `src/app/[lang]/privacy/page.tsx`, `src/app/[lang]/terms/page.tsx`, and (as the reference pattern) `src/app/[lang]/about/page.tsx` in full. Confirm each broken file's exact current import block, `generateMetadata` body, and component body before editing — do not guess at line numbers; use what you actually read.

- [ ] **Step 2: Fix `src/app/[lang]/faq/page.tsx`**

Add the import: `import { getStoreConfig } from "@/lib/store-config";` (alongside the other `@/lib/seo` import).

In `generateMetadata`, add `const { site, locations } = await getStoreConfig();` before the `return pageMetadata(...)` call, and add `, { site, locations }` as the final argument to that `pageMetadata(...)` call.

In the page component, add `const { site, locations } = await getStoreConfig();` near the top (alongside any existing `getDictionary`/`getSeo` calls), and add `, { site, locations }` as the final argument to the `breadcrumbGraph(...)` call.

- [ ] **Step 3: Fix `src/app/[lang]/privacy/page.tsx`**

Same pattern as Step 2: add the `getStoreConfig` import, fetch `{ site, locations }` in `generateMetadata` and pass to `pageMetadata(...)`, fetch again in the component and pass to `breadcrumbGraph(...)`.

- [ ] **Step 4: Fix `src/app/[lang]/terms/page.tsx`**

Same pattern as Step 2.

- [ ] **Step 5: Fix `src/app/[lang]/gallery/page.tsx`**

Same pattern as Step 2, PLUS: this page also calls `imageGalleryGraph(dict.gallery.title, galleryImages, (id) => ({...}))` with no `cfg` — add `, { site, locations }` as its final argument too.

- [ ] **Step 6: Type-check**

Run: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -vE "bun:test|Cannot find (name 'Bun'|module 'bun')"`
Expected: NO output. If any error remains, it is a missed call site — fix it (re-check with the full-repo grep from the plan's background section; every caller was already enumerated, so a remaining error means a typo, not a new file).

- [ ] **Step 7: Run the full test suite**

Run: `bun test src/`
Expected: all pass. Report the count (baseline before this branch: 551 — pure signature + 4-page fixes shouldn't change the count, since no new test files are added, only Task 2's existing test modified).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[lang]/faq/page.tsx" "src/app/[lang]/gallery/page.tsx" "src/app/[lang]/privacy/page.tsx" "src/app/[lang]/terms/page.tsx"
git commit -m "fix(seo): faq/gallery/privacy/terms now resolve live site config (were silently stale after a site.name override)"
```

---

## Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `bun test src/`
Expected: all pass, 0 fail, count ≈551 (Task 2 modifies one existing test, doesn't add a new one).

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -vE "bun:test|Cannot find (name 'Bun'|module 'bun')"`
Expected: NO output.

- [ ] **Step 3: Production build**

Run: `bun run build`
Expected: `next build` completes; all pages generate, including `/faq`, `/gallery`, `/privacy`, `/terms` in both locales. This is the ultimate proof every one of the 19 call sites now compiles with a real `cfg`.

- [ ] **Step 4: Confirm the fix, live, before shipping (manual verification of the actual bug)**

This is NOT a step that can be scripted — but before merging, a build-output check is enough: confirm `bun run build`'s output includes the 4 pages without error (Step 3). The behavioral proof (does a `site.name` override actually now propagate to these 4 pages) is implicitly guaranteed by using the exact same `getStoreConfig()`-then-pass-cfg pattern already proven correct on the other 15 pages — no bespoke logic was introduced.

- [ ] **Step 5: Report** final test count, tsc result, build status. No commit.

---

## Self-Review checklist (applied)

- **Spec coverage:** 6 builder signatures required (T1); stale test fixed (T2); 4 broken pages fixed with the established pattern (T3); full verify incl. build (T4).
- **Behavior preservation:** the 15 already-correct pages are untouched; `organizationGraph`/`faqPageGraph` untouched; `schema-invariants.test.ts` already compliant, untouched.
- **The actual bug is fixed, not just papered over:** the 4 pages now fetch the SAME live `getStoreConfig()` result every other page uses — not a bespoke shortcut.
- **No placeholders:** every step has full code or an explicit "read the file first, don't guess line numbers" instruction for the 4 page edits (their exact current content wasn't pre-transcribed into this plan — Task 3 Step 1 requires reading them first).
- **Regression test = the compiler:** per grilling Q3, `tsc`/`bun run build` (already a deploy gate) is the enforcement mechanism; no new runtime test added, consistent with no page having its own test file today.
