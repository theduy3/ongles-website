---
phase: 02-schema-completeness-correctness
plan: "04"
subsystem: schema-org-json-ld
tags: [schema-org, faq, faqpage, parity, dictionaries, build-guard, multi-tenant]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [faq-completeness-invariant, dictionaries-faq-parity]
  affects: [src/config/schema-invariants.ts, src/config/seo/seo-parity.test.ts]
tech_stack:
  added: []
  patterns:
    - "F-01 validateFaqCompleteness() folded into validateSchemaInvariants — runs in the next.config.ts build guard"
    - "F-02 dictionaries faq.items FR/EN key-path + non-empty parity added to seo-parity.test.ts"
    - "FAQ check is alias-free (reads raw dict items, never imports faqPageGraph) — Docker build-guard safe"
key_files:
  created: []
  modified:
    - src/config/schema-invariants.ts
    - src/config/seo/seo-parity.test.ts
decisions:
  - "PLAN DEVIATION (Rule 7): plan Task 1 said import faqPageGraph into schema-invariants.ts; the 02-03 module header (and memory 32450) forbid importing seo.ts — it drags @/lib/* aliases that MODULE_NOT_FOUND in the Node-20 Docker build guard. Resolved by checking raw dict items (q/a non-empty) instead; faqPageGraph is a pure 1:1 items.map so source non-emptiness ⇔ emitted non-emptiness, and the mainEntity-count contract is pinned by the test (which may import faqPageGraph)."
  - "F-01 is per-locale (global dictionaries), not per-tenant — FAQ content lives in src/dictionaries/{locale}.json, shared across tenants"
  - "Dictionary imports are static relative JSON (resolveJsonModule true) — build-guard-safe, no alias"
metrics:
  duration: "~25 minutes (incl. orchestrator takeover after executor truncation)"
  completed: "2026-06-18T23:30:00Z"
  tasks_completed: 2
  files_changed: 2
  closeout: "Implemented + closed out by orchestrator inline — the gsd-executor subagent truncated mid-RED (no commits, two uncommitted test files). Orchestrator confirmed RED, implemented GREEN, ran all gates, committed RED→GREEN in order."
---

# Phase 02 Plan 04: FAQ Completeness + Dictionary Parity Summary

**One-liner:** A build-guard-enforced F-01 invariant guarantees no FAQ item is dropped or left blank from FAQPage schema, and F-02 extends the FR/EN parity guard to `dictionaries/{en,fr}.json` `faq.items` so Phase 3's FAQ deepening is drift-protected from day one.

## Tasks Completed

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | F-01 FAQ completeness invariant (RED→GREEN) | 7fe5ceb (RED) → c7d4cbf (GREEN) | schema-invariants.ts, schema-invariants.test.ts |
| 2 | F-02 dictionaries FR/EN faq.items parity | 7fe5ceb (RED, test-only) | seo-parity.test.ts |

## Verification Evidence (orchestrator-confirmed)

### Targeted (F-01 + F-02)
```
54 pass / 0 fail / 163 expect() calls — schema-invariants.test.ts + seo-parity.test.ts
```

### Full suite
```
202 pass / 0 fail / 399 expect() calls across 27 files
```
(was 189 before this plan; +13 FAQ/parity tests, no regressions)

### TypeScript
`bunx tsc --noEmit` — zero non-test errors. Pre-existing `bun:test` TS2307 noise unchanged.

### Deploy gate — `next build`
`bunx next build` → exit 0, full route table. F-01 now runs inside `assertSchemaInvariants()` in the `PHASE_PRODUCTION_BUILD` guard and does NOT break the Docker `.ts` import chain (alias-free).

## What Changed

### src/config/schema-invariants.ts
- Static JSON imports of `../dictionaries/fr.json` + `../dictionaries/en.json` and a `FAQ_LOCALES` const (FR + EN; ES deferred).
- `export function validateFaqCompleteness(tenantId, locale, items)` — returns `F-01` errors for any empty `q`/`a` (or an empty items array). Operates on raw items, alias-free.
- `function checkFaqCompleteness()` — runs F-01 across `FAQ_LOCALES`.
- Wired `errors.push(...checkFaqCompleteness())` into `validateSchemaInvariants()` (so the build guard enforces it).

### src/config/seo/seo-parity.test.ts
- New `F-02: dictionaries faq.items FR/EN parity` describe block: identical `faq` key structure, equal `items` length, per-entry key-path parity, and non-empty `q`/`a` for both FR and EN.

### src/config/schema-invariants.test.ts
- F-01 describe block: `validateFaqCompleteness` valid/empty-q/empty-a cases, `faqPageGraph` mainEntity-count === items-count (FR + EN), dict items non-empty, and `validateSchemaInvariants()` surfaces zero F-01 errors on current data.

## Plan Deviations

**Task 1 — did NOT import `faqPageGraph` into `schema-invariants.ts`** (plan's literal instruction). The 02-03 module header forbids importing `src/lib/seo.ts` because its `@/lib/*` aliases cause `MODULE_NOT_FOUND` in the Node-20 Docker build guard (Phase-1 lesson; memory 32450). Importing it would have re-broken the Dokploy deploy — the exact failure mode 02-03 hardened against. Resolved by validating raw dictionary items: since `faqPageGraph` is a pure 1:1 `items.map` (`name←q`, `acceptedAnswer.text←a`), source-item non-emptiness is equivalent to emitted-node non-emptiness, and the 1:1 `mainEntity` count contract is pinned in the test file (which imports `faqPageGraph` freely — tests aren't subject to the Docker constraint). Truths 1–2 fully covered; build guard stays alias-safe.

**Closeout by orchestrator.** The gsd-executor subagent truncated mid-RED (wrote both test files but committed nothing). The orchestrator confirmed the RED state, committed RED first (7fe5ceb), implemented GREEN, ran all gates, and committed GREEN (c7d4cbf) — TDD order preserved.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-02 integrity | schema-invariants.ts | blank/dropped FAQ items abort the production build (F-01 in C-02 guard) |
| FR-parity drift | seo-parity.test.ts | missing/blank FR or EN faq.items key fails the suite (F-02) — protects Phase 3 CONTENT-02 |

## Self-Check

### Modified files present
- `src/config/schema-invariants.ts` (validateFaqCompleteness + checkFaqCompleteness wired)
- `src/config/seo/seo-parity.test.ts` (F-02 block)

### Commits exist
```
c7d4cbf feat(02-04): FAQ completeness invariant (F-01) — GREEN
7fe5ceb test(02-04): RED — FAQ completeness (F-01) + dictionaries FR/EN parity (F-02)
```

## Self-Check: PASSED
