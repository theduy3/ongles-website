---
phase: 04-net-new-pages
reviewed: 2026-06-19T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/app/[lang]/tarifs/page.tsx
  - src/app/[lang]/pricing/page.tsx
  - src/app/[lang]/comparaisons/[slug]/page.tsx
  - src/app/[lang]/comparisons/[slug]/page.tsx
  - src/app/[lang]/beauport/page.tsx
  - src/app/[lang]/charlesbourg/page.tsx
  - src/app/[lang]/trois-rivieres/page.tsx
  - src/app/sitemap.ts
  - src/components/PricingTable.tsx
  - src/components/NearMeDetails.tsx
  - src/components/ComparisonColumns.tsx
  - src/components/Header.tsx
  - src/config/schema-invariants.ts
  - src/config/types.ts
  - src/lib/comparisons.ts
  - src/lib/seo.ts
  - src/config/seo/seo.fr.json
  - src/config/seo/seo.en.json
  - src/config/tenants/ongles-maily/site.ts
  - src/config/tenants/ongles-charlesbourg/site.ts
  - src/config/tenants/ongles-rivieres/site.ts
  - src/config/tenants/ongles-maily/seo.fr.json
  - src/config/tenants/ongles-maily/seo.en.json
  - src/config/tenants/ongles-charlesbourg/seo.fr.json
  - src/config/tenants/ongles-rivieres/seo.fr.json
  - src/app/[lang]/seo-content.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-06-19
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Phase 4 added five categories of net-new pages (pricing, comparison ×4, borough near-me ×3), a sitemap update, three new components, and build-time guards in `schema-invariants.ts`. The implementation is structurally sound and locale-guard logic is correct throughout. However three blockers were found: two wrong-address copy-paste errors in FR SEO metadata that will serve incorrect street addresses to search engines for Charlesbourg and Trois-Rivières, and an unsafe type cast in both comparison pages that silently passes `undefined` to `.metaTitle`/`.metaDescription`/`.body` if `COMPARISONS` and the SEO JSON ever diverge. Warnings cover a type contract mismatch (`priceTo` declared required in `types.ts` but treated as optional everywhere it is consumed), dead code, an unused import voided with a misleading comment, and hardcoded inline strings in NearMeDetails. No security issues were found.

---

## Critical Issues

### CR-01: Wrong street address in FR SEO metadata for Charlesbourg and Trois-Rivières

**Files:**
- `src/config/tenants/ongles-charlesbourg/seo.fr.json:20`
- `src/config/tenants/ongles-rivieres/seo.fr.json:20`

**Issue:** Both FR `locationsDescription` fields were copy-pasted from Ongles Maily and never updated to reflect the correct street address. These values populate the `<meta name="description">` tag on the `/[lang]/locations` page and are indexed by search engines.

- `ongles-charlesbourg/seo.fr.json` line 20 says: `"3333 rue du Carrefour, Entrées 4 ou 5"` — the Beauport address. The real address from `site.ts` is `8500 boulevard Henri-Bourassa`.
- `ongles-rivieres/seo.fr.json` line 20 says: `"3333 rue du Carrefour, Entrées 4 ou 5"` — the Beauport address. The real address from `site.ts` is `4225 boulevard des Forges, Trois-Rivières`.

The EN counterparts are correct (`seo.en.json` for both tenants has the right addresses). This is a FR-only regression that will misinform users and send wrong NAP signals to Google for these two tenants.

**Fix:**
```json
// ongles-charlesbourg/seo.fr.json line 20
"locationsDescription": "Trouvez Ongles Charlesbourg au Carrefour Charlesbourg — 8500 boulevard Henri-Bourassa, Entrée 5, Québec, QC G1G 5X1.",

// ongles-rivieres/seo.fr.json line 20
"locationsDescription": "Trouvez Ongles Rivières au Centre Les Rivières — 4225 boulevard des Forges, Trois-Rivières, QC G8Y 1W2.",
```

---

### CR-02: Unsafe `record.id` cast may produce `undefined` without a runtime error

**Files:**
- `src/app/[lang]/comparaisons/[slug]/page.tsx:33` and `:57`
- `src/app/[lang]/comparisons/[slug]/page.tsx:33` and `:57`

**Issue:** Both comparison page files do:

```typescript
const c = seo.pages.comparison[record.id as keyof typeof seo.pages.comparison];
```

`ComparisonRecord.id` is typed as `string`, not as a literal union of the four known slugs. The `as keyof typeof` cast silences TypeScript but provides no runtime guarantee. If `record.id` contains a value that is not a key in `seo.pages.comparison` — which can happen if a new entry is added to `COMPARISONS` in `comparisons.ts` before the corresponding key is added to the SEO JSON files — the expression evaluates to `undefined`. The code then immediately accesses `c.metaTitle`, `c.metaDescription`, `c.answerHeading`, `c.answerBlock`, and `c.body` without any null check, crashing the page with `TypeError: Cannot read properties of undefined`.

Today the four IDs happen to match exactly, so no crash occurs at this moment. But there is no build-time or runtime guard preventing the IDs from diverging, and there is no test that exercises a mismatched ID. The cast is what makes this a silent failure path rather than a caught type error.

**Fix — add a runtime guard before the cast:**
```typescript
const c = seo.pages.comparison[record.id as keyof typeof seo.pages.comparison];
if (!c) {
  // record.id exists in COMPARISONS but has no SEO entry — treat as not found
  notFound();
}
```

Apply the same guard in `generateMetadata` (both files) where `c` is also used without a null check after the cast.

---

### CR-03: `priceTo` declared as required `number` in `types.ts` but treated as optional throughout all consumers

**File:** `src/config/types.ts:22`

**Issue:** The `Service` type declares:

```typescript
priceTo: number; // upper bound for AggregateOffer range
```

This makes `priceTo` a required, non-optional field. However every consumer treats it as optional:

- `PricingTable.tsx:15` — `PricingRow` types it as `priceTo?: number`
- `PricingTable.tsx:37` — `formatPriceRange` parameter is `priceTo: number | undefined`
- `seo.ts:152` — `offer(price: number, priceTo?: number)` — the function signature is `priceTo?: number`
- `seo.ts:314` — `ServiceItem.priceTo?: number` — optional in the graph item type
- Both pricing pages (`tarifs/page.tsx:56`, `pricing/page.tsx:56`) — pass `service.priceTo` into a `PricingRow` typed as optional

The contract is contradictory. Since all four live services currently have a `priceTo` value set, nothing crashes today. But:

1. TypeScript accepts `service.priceTo` where `priceTo?: number` is expected because `number` is assignable to `number | undefined` — so the type mismatch is invisible at call sites.
2. If someone adds a service where a price range makes no sense and sets `priceTo: 0`, `formatPriceRange`'s `!priceTo` guard catches `0` as falsy and omits the range — correct behaviour, but only by coincidence.
3. The `offer()` function in `seo.ts` checks `priceTo !== undefined` — which is always true since `priceTo` is required. The real guard is `priceTo > price` on the next line, so AggregateOffer is emitted when `priceTo > price`. This is correct by accident, but if `priceTo` were `0` (meaning "no upper bound"), `offer()` would emit a plain `Offer` correctly — but only because `0 > price` is false. The type contract gives no guidance.

The correct fix is to make `priceTo` optional in `types.ts` (`priceTo?: number`) to match how it is actually used, or make it required and update all consumers to handle `0` as "no upper bound" explicitly. Leaving the mismatch in place is a maintenance trap.

**Fix (preferred — align type.ts with actual usage):**
```typescript
// src/config/types.ts
export type Service = {
  id: ServiceId;
  slug: Record<Locale, string>;
  price: number;
  priceTo?: number; // optional upper bound; omit when no range applies
  photo: boolean;
};
```

---

## Warnings

### WR-01: `checkNearMeWordCount` is a private dead function — never called

**File:** `src/config/schema-invariants.ts:787-808`

**Issue:** `checkNearMeWordCount()` is a private function (not exported, not called from anywhere). The comment above it says it is "LIVE from 04-03" and "superseded by checkWordCount() for the nearMe scope." The function is defined at line 787 but appears zero times in any call site — `validateSchemaInvariants()` calls `checkWordCount()` (line 826) instead, which covers both nearMe and comparison bodies.

The dead function is a maintenance hazard: it makes the file harder to reason about (is this an alternative gate? a fallback? intentionally disabled?), and its misleading "LIVE from 04-03" comment directly contradicts the actual call graph.

**Fix:** Remove the function body and its comment block (lines 777–808), or add a note that it was superseded and will be deleted after 04-05 merges, whichever matches intent.

---

### WR-02: `comparisonPathsByLocale` imported in `sitemap.ts` but not used — voided with a misleading comment

**File:** `src/app/sitemap.ts:4`, `109`

**Issue:**
```typescript
import { COMPARISONS, comparisonPathsByLocale } from "@/lib/comparisons";
// ...
void comparisonPathsByLocale; // line 109
```

`comparisonPathsByLocale` is not called anywhere in `sitemap.ts`. The `void` expression is used solely to prevent a "imported but unused" lint error. The comment claims: *"This import is used to keep the module dependency explicit."* That is not a valid justification — `void`ing a function reference does not execute it, does not validate its shape, and does not keep any dependency "explicit" in any meaningful sense. This pattern actively suppresses a lint warning that is correct.

**Fix:** Remove the import and the `void` line. The `COMPARISONS` array already provides all slug data needed; `comparisonPathsByLocale` is not required by `sitemap.ts`.

```typescript
// Remove from import:
import { COMPARISONS } from "@/lib/comparisons";
// Remove line 109 entirely
```

---

### WR-03: `dict.serviceDetails[service.id].title` accessed without null guard in pricing pages

**Files:**
- `src/app/[lang]/tarifs/page.tsx:54` and `:61`
- `src/app/[lang]/pricing/page.tsx:54` and `:61`

**Issue:** Both pricing pages call:
```typescript
name: dict.serviceDetails[service.id].title,
```

`service.id` is typed as `ServiceId` and `dict.serviceDetails` keys are `ServiceId` values, so this is safe today with the four known service IDs. However `services` comes from `getStoreConfig()` which deep-merges DB overrides (line 79 of `store-config.ts`). If a DB override added a service with an unexpected id, `dict.serviceDetails[service.id]` would be `undefined` and `.title` would throw `TypeError` at runtime — crashing the page with no recovery path.

The same access on line 62 (`seo.services[service.id].schemaDescription`) carries the same risk for the `graphItems` array.

**Fix — add optional chaining with a fallback:**
```typescript
name: dict.serviceDetails[service.id]?.title ?? service.id,
// and
description: seo.services[service.id]?.schemaDescription ?? "",
```

---

### WR-04: Near-me pages use `locations[0]` with no tenant-specific location selector

**Files:**
- `src/app/[lang]/beauport/page.tsx:44`
- `src/app/[lang]/charlesbourg/page.tsx:43`
- `src/app/[lang]/trois-rivieres/page.tsx:43`

**Issue:** All three near-me pages do:
```typescript
const location = locations[0];
if (!location) notFound();
```

`locations[0]` is an implicit assumption that each tenant has exactly one location and it is always first. This is true today and `notFound()` guards the empty case, but if a tenant ever gains a second location, the borough page would silently serve the first location's NAP regardless of which borough it is for. There is no assertion that `locations[0]` is the correct location for this tenant's borough slug.

More immediately: the ongles-maily `/beauport` page serves `locations[0]` which is correct (Beauport is their location). The ongles-charlesbourg `/charlesbourg` page also serves `locations[0]` (Charlesbourg) correctly. But the design pattern is brittle — it relies on array ordering with no documented invariant.

**Fix:** Add an explicit comment or, better, a lookup by location slug:
```typescript
// When the tenant gains a second location, replace this with a lookup by slug.
const location = locations.find((l) => l.slug === "beauport") ?? locations[0];
if (!location) notFound();
```

---

### WR-05: `NearMeDetails` hardcodes locale strings instead of using the dictionary

**File:** `src/components/NearMeDetails.tsx:59`, `:73`, `:98`

**Issue:** Three strings are hardcoded with inline `lang === "fr" ?` ternaries instead of coming from the dictionary:

```typescript
{lang === "fr" ? "Heures d'ouverture" : "Opening hours"}  // line 59
{lang === "fr" ? "Nos services" : "Our services"}           // line 73
{lang === "fr" ? "Réserver en ligne" : "Book Online"}       // line 98
```

This contradicts the established pattern where all UI copy lives in `src/dictionaries/{locale}.json` and is accessed via `getDictionary()`. If a third locale is added (ES is planned per AGENTS.md), these labels will silently fall through to the EN fallback with no compile error or type error.

The existing `dict.cta.book` key already provides a localized booking label that could replace line 98. Lines 59 and 73 would need new dictionary keys.

**Fix:** Add `nearMe` UI label keys to both dictionaries and pass them as props or extend the `dict` object:
```json
// dictionaries/fr.json — add under a new "nearMe" key or extend "nav"/"cta"
"nearMe": {
  "openingHours": "Heures d'ouverture",
  "ourServices": "Nos services"
}
```
Then pass these through or thread `dict` into `NearMeDetails`.

---

## Info

### IN-01: `dict.cta.viewServices` fallback in near-me pages is unreachable dead code

**Files:**
- `src/app/[lang]/beauport/page.tsx:91`
- `src/app/[lang]/charlesbourg/page.tsx:89`
- `src/app/[lang]/trois-rivieres/page.tsx:89`

**Issue:** All three pages use:
```typescript
{dict.cta.viewServices ?? (lang === "fr" ? "Voir l'adresse" : "Find us")}
```

`dict.cta.viewServices` is a defined, non-empty string in both FR (`"Voir les services"`) and EN (`"View Services"`) dictionaries. The null-coalescing fallback is therefore never reached. If it were reached, the fallback copy (`"Voir l'adresse"` / `"Find us"`) would also be semantically wrong for a button pointing to `/locations`.

**Fix:** Remove the fallback:
```typescript
{dict.cta.viewServices}
```

---

### IN-02: `ComparisonColumns` component is exported but never imported by any page

**File:** `src/components/ComparisonColumns.tsx`

**Issue:** `ComparisonColumns` is a complete, working server component, but neither the FR comparison page (`comparaisons/[slug]/page.tsx`) nor the EN comparison page (`comparisons/[slug]/page.tsx`) imports or renders it. The comparison pages use `AnswerBlock` + a manual `<section>` with `c.body.split(/\n\n+/)` for the decision body instead. This was acknowledged in the review brief as an intentional decision — the data model carries no per-side column content.

The component is not dead in the sense of being broken; it compiles and is coherent. But it is dead in the sense of being unreachable from any current page. Maintainers encountering it will not know whether it is planned for a future wave, should be wired in now, or should be deleted.

**Fix:** Add a comment at the top of the file making the status explicit:
```typescript
/**
 * ComparisonColumns — authored for Phase 4 but intentionally not wired into
 * comparison pages (the data model carries no per-side column content).
 * Wire in Phase 5 if per-slug left/right column data is added to seo.json,
 * or delete if the two-column layout is not pursued.
 */
```

---

### IN-03: Sitemap `defaultLocale` derived from `locales[0]` with a comment instead of importing `defaultLocale`

**File:** `src/app/sitemap.ts:50`

**Issue:**
```typescript
const defaultLocale = locales[0]; // fr is index 0 (the canonical default)
```

`@/lib/i18n` already exports `defaultLocale` as a named constant. The sitemap re-derives it by assuming array position `0`, which is correct today but fragile if the `locales` array is ever reordered. The comment acknowledging this fragility is evidence it was noticed.

**Fix:**
```typescript
import { locales, defaultLocale } from "@/lib/i18n";
// Remove the local `const defaultLocale = locales[0]` line
```

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
