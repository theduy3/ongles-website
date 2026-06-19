---
phase: 04-net-new-pages
plan: "01"
subsystem: seo-foundation
tags: [schema, guards, parity, tdd, json-scaffold, pricingGraph]
dependency_graph:
  requires: [03-05-SUMMARY]
  provides: [measureSentenceOverlap, checkWordCount, checkCrossTenantOverlap, checkRoutePresence, pricingGraph, pages-key-namespace]
  affects: [schema-invariants.ts, seo.ts, seo.*.json (base+3 tenants)]
tech_stack:
  added: []
  patterns: [Jaccard-sentence-overlap, thin-wrapper-export, json-scaffold-parity]
key_files:
  created: []
  modified:
    - src/config/schema-invariants.ts
    - src/lib/seo.ts
    - src/config/seo/seo.fr.json
    - src/config/seo/seo.en.json
    - src/config/tenants/ongles-maily/seo.fr.json
    - src/config/tenants/ongles-maily/seo.en.json
    - src/config/tenants/ongles-charlesbourg/seo.fr.json
    - src/config/tenants/ongles-charlesbourg/seo.en.json
    - src/config/tenants/ongles-rivieres/seo.fr.json
    - src/config/tenants/ongles-rivieres/seo.en.json
    - src/config/schema-invariants.test.ts
    - src/config/seo/seo-parity.test.ts
    - src/lib/seo.test.ts
decisions:
  - "measureSentenceOverlap: split sentences first (preserving periods), then normalize each sentence — not normalize-then-split (which strips periods, breaking the splitter)"
  - "pricingGraph is a pure thin wrapper over servicesGraph — no logic duplication, Phase 2 SCHEMA-02 invariant inherited for free"
  - "pages.* keys scaffolded with identical structure in FR and EN (8 files) — placeholder empty strings satisfy typeof-string parity tests while real copy lands in later waves"
  - "New guards exported but UNWIRED from validateSchemaInvariants() — 04-05 flips the gate after all per-tenant content lands"
metrics:
  duration: "~6 minutes (RED: f30e468, GREEN: 44bc949)"
  completed: "2026-06-19"
  tasks_completed: 2
  files_changed: 13
status: complete
requirements: [PAGE-01, PAGE-02, PAGE-03]
---

# Phase 04 Plan 01: Net-New-Page Foundation — Guards, pricingGraph, pages.* Scaffold

## One-liner

Jaccard sentence-overlap guard + word-count guard + route-presence guard + `pricingGraph` thin wrapper + `pages.*` JSON key namespace scaffolded and parity-clean across base and 3 tenant files, with all 54 new Phase 4 tests green alongside the existing 282.

## What Was Built

### Task 1: RED (commit f30e468)

Added failing tests to three files before writing any implementation:

- **`src/config/schema-invariants.test.ts`**: New `describe` block "Phase 4 net-new-page guards" importing `measureSentenceOverlap`, `checkWordCount`, `checkCrossTenantOverlap`, `checkRoutePresence`, `COMPARISON_WORD_FLOOR`, `NEAR_ME_WORD_FLOOR`, `NEW_PAGE_OVERLAP_THRESHOLD`. Inline deterministic fixtures test the Jaccard overlap algorithm (identical 1.0, disjoint 0, 25% shared less than 0.30, 35% shared at least 0.30), threshold constant values, word-count predicate behavior, and callable-array signatures for all three guard functions.
- **`src/config/seo/seo-parity.test.ts`**: Extended with Phase 4 `pages.pricing.*`, `pages.comparison.{4 slugs}.body`, `pages.nearMe.*` typeof-string assertions over base + 3 tenant seo JSON files (FR + EN). Widened `SeoDocWithPages` type to include the pages namespace.
- **`src/lib/seo.test.ts`**: New `describe` "Phase 4: pricingGraph" importing not-yet-existing `pricingGraph`; asserting `@type === "ItemList"`, `AggregateOffer` with `lowPrice`/`highPrice` when `priceTo > price`, `Offer` when `priceTo === price` or absent.

Result: 34 failing tests + 2 compilation errors (missing exports); existing 282 tests remained green.

### Task 2: GREEN (commit 44bc949)

**`src/config/schema-invariants.ts` — additions only, alias-free:**

- Exported constants: `COMPARISON_WORD_FLOOR = 200`, `NEAR_ME_WORD_FLOOR = 150`, `NEW_PAGE_OVERLAP_THRESHOLD = 0.30`, internal `NEW_COMPARISON_SLUGS`.
- Extended `SeoAnswerSource` type with optional `pages` field (pricing / comparison / nearMe).
- `measureSentenceOverlap(textA, textB)`: split sentences first (to preserve `.` for the splitter), then normalize each sentence (lowercase, strip non-word punctuation, collapse whitespace), compute Set Jaccard.
- `checkWordCount()`: comparison body at least 200 words, nearMe.answerBlock at least 150 words per tenant per locale.
- `checkCrossTenantOverlap()`: for each tenant pair, measure Jaccard on `pages.nearMe.answerBlock`; error when at least 0.30 and both blocks non-empty.
- `checkRoutePresence()`: checks `site.routes` (optional field) for FR pricing slug `"tarifs"`.
- All 4 functions **unwired** from `validateSchemaInvariants()` per plan prohibition.

**`src/lib/seo.ts` — pure addition:**

- `export function pricingGraph(lang, items, cfg?)`: thin wrapper over `servicesGraph()`. Zero logic duplication; `offer()`/`servicesGraph()`/`serviceGraph()` bodies untouched (D-28).

**seo.{fr,en}.json — 8 files (base + 3 tenants x 2 locales):**

Added `pages` object with identical key structure in FR and EN:
- `pricing`: `{answerHeading, answerBlock, metaTitle, metaDescription}` all `""`
- `comparison`: 4 slugs (`pose-vs-remplissage`, `manucure-vs-pedicure`, `gel-vs-acrylique`, `meilleur-pour`) each `{answerHeading, answerBlock, body, metaTitle, metaDescription}` all `""`
- `nearMe`: `{answerHeading, answerBlock, boroughName, body, metaTitle, metaDescription}` all `""`

## Verification Results

| Check | Result |
|-------|--------|
| `bun test src/` | 336 pass, 0 fail |
| `bun run build` (from main repo) | succeeds |
| `export function pricingGraph` in seo.ts | line 376 |
| All 4 guard exports in schema-invariants.ts | lines 307, 353, 403, 445 |
| offer()/servicesGraph()/serviceGraph() untouched | no removals from seo.ts (pure additions) |
| New guards NOT in validateSchemaInvariants() | confirmed |
| pages.* keys FR/EN parity across all 8 files | all parity tests green |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f30e468 | test(04-01) | RED: Phase 4 guard unit tests + parity extension + pricingGraph shape test (failing) |
| 44bc949 | feat(04-01) | GREEN: implement unwired guards, pricingGraph wrapper, and pages.* JSON key scaffold |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed measureSentenceOverlap normalize-then-split ordering**

- **Found during:** Task 2 first test run (1 failure remained after implementation)
- **Issue:** Original implementation called `normalize()` (which strips periods) before `splitSentences()`, causing `splitSentences` to receive period-free text and produce a single sentence from multi-sentence input. Jaccard was always 0 for any text that had stripped punctuation.
- **Fix:** Restructured to split sentences first (preserving periods for the sentence splitter), then normalize each individual sentence.
- **Files modified:** `src/config/schema-invariants.ts` (measureSentenceOverlap internals)
- **Commit:** Included in 44bc949

No other deviations.

## Known Stubs

The `pages.*` JSON keys are intentional placeholder stubs — all values are `""`. This is the design: the scaffold establishes the key namespace and satisfies `typeof string` parity tests. Real per-tenant copy lands in later Phase 4 waves (04-02 through 04-04). The stubs do not prevent this plan's goal (foundation scaffolding + guard existence), and the plan explicitly documents this as the intended state.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced.

## Self-Check: PASSED

All required files exist in worktree. Both commits (f30e468, 44bc949) found in git log. Final test run: 336 pass, 0 fail across 28 files.
