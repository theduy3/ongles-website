---
phase: 02-schema-completeness-correctness
plan: "03"
subsystem: schema-org-json-ld
tags: [schema-org, schema-dts, build-guard, invariants, ci, multi-tenant]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [schema-dts-typing, offline-schema-invariants, build-guard-schema-enforcement]
  affects: [src/lib/seo.ts, next.config.ts, src/config/schema-invariants.ts]
tech_stack:
  added: ["schema-dts@2.0.0 (dev)"]
  patterns:
    - "Offline invariant asserter mirrors config-completeness.ts (pure, static-import-only, no process.env)"
    - "assertSchemaInvariants() wired into next.config.ts PHASE_PRODUCTION_BUILD guard (C-02)"
    - "Builders carry schema-dts WithContext<T> return types; organizationGraph uses local SeoGraph interface (schema-dts has no @graph wrapper in 2.0.0)"
key_files:
  created:
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/lib/seo.ts
    - next.config.ts
    - src/lib/reviews-r02-gate.test.ts
decisions:
  - "schema-invariants validator chain is fully STATIC-import (next.config.ts → schema-invariants.ts → TENANT_REGISTRY + seo.ts) — dynamic import() would break .ts resolution in Node-20 Docker (Phase 1 lesson, pitfall 1)"
  - "Invariants iterate TENANT_REGISTRY excluding 'template'; builders called with explicit per-tenant SeoConfig, not the module singleton (RESEARCH pitfall 2)"
  - "organizationGraph annotated via local SeoGraph interface — schema-dts 2.0.0 has no @graph wrapper type"
  - "next build is the deploy gate; guard passes on valid configs and aborts on any invariant violation (C-02)"
metrics:
  duration: "~19 minutes"
  completed: "2026-06-18T23:14:00Z"
  tasks_completed: 3
  files_changed: 7
  closeout: "SUMMARY + STATE/ROADMAP written by orchestrator — executor truncated after committing Task 3 (implementation + commits intact; verified by orchestrator before closeout)"
---

# Phase 02 Plan 03: Schema Invariants + Build Guard Summary

**One-liner:** Every JSON-LD builder is `schema-dts`-typed, an offline `schema-invariants.ts` module asserts eight invariant groups per tenant, and `assertSchemaInvariants()` is wired into the `next.config.ts` production-build guard so invalid schema aborts the Dokploy deploy.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Package-legitimacy checkpoint (schema-dts@2.0.0) | — | Approved by user via orchestrator |
| 1 | schema-dts typing on all seo.ts builders | b109f1b | package.json, package-lock.json, seo.ts |
| 2 | schema-invariants module — RED then GREEN | 46c0622 (RED) → 4800cd0 (GREEN) | schema-invariants.test.ts, schema-invariants.ts, reviews-r02-gate.test.ts |
| 3 | Wire assertSchemaInvariants into next.config.ts guard | 0ca1709 | next.config.ts |

## Verification Evidence (orchestrator-confirmed)

### schema-invariants test
```
32 pass
0 fail
73 expect() calls
Ran 32 tests across 1 file.
```

### Full suite
```
189 pass
0 fail
330 expect() calls
Ran 189 tests across 27 files.
```
(was 157 before this plan; +32 invariant tests, no regressions)

### TypeScript
`bunx tsc --noEmit` — no errors in `seo.ts` or `schema-invariants.ts`. Only the pre-existing `bun:test` TS2307 in test files remains (known baseline noise, unchanged).

### Deploy gate — `next build`
`bunx next build` SUCCEEDED — full route table emitted, no guard abort. Confirms `assertSchemaInvariants()` passes on current valid configs and does not falsely abort.

### Guard wiring (static, no dynamic import)
```
next.config.ts:20  import { assertSchemaInvariants } from "./src/config/schema-invariants";
next.config.ts:58  assertSchemaInvariants();
(no `await import(...schema-invariants)` present)
```

## What Changed

### package.json / package-lock.json
`schema-dts@^2.0.0` added to devDependencies (Google-published, dev-only, zero runtime cost — user-approved checkpoint).

### src/lib/seo.ts
schema-dts return types added to all builders (`servicesGraph` → `WithContext<ItemList>`, `serviceGraph` → `WithContext<SchemaService>`, `faqPageGraph` → `WithContext<FAQPage>`, `breadcrumbGraph` → `WithContext<BreadcrumbList>`, `imageGalleryGraph` → `WithContext<ImageGallery>`, `offer()` → `AggregateOffer | Offer`). `organizationGraph` annotated via a local `SeoGraph` interface (schema-dts 2.0.0 has no `@graph` wrapper). Typing-only — no runtime behavior change.

### src/config/schema-invariants.ts (new)
Pure, static-import-only module mirroring `config-completeness.ts`. Exports `validateSchemaInvariants(): SchemaInvariantError[]` and `assertSchemaInvariants(): void`. Iterates `TENANT_REGISTRY` (excluding `template`), builds an explicit per-tenant `SeoConfig`, and asserts: `@context`, canonical `@id` shape, cross-tenant `@id` uniqueness (I-02), `sameAs` absent-or-non-empty (I-03), FAQ builder does not drop items, R-02 AggregateRating suppression/presence, required NailSalon fields, distinct Organization node (O-01), and `offer()` AggregateOffer/Offer correctness (SCHEMA-02).

### src/config/schema-invariants.test.ts (new)
bun:test written RED-first (commit 46c0622 before GREEN 4800cd0). 32 assertions across the invariant groups incl. negative cases (collision, empty sameAs, unbacked rating).

### next.config.ts
Static `import { assertSchemaInvariants }`; called inside `PHASE_PRODUCTION_BUILD` immediately after `assertAllTenantsComplete()`, with a comment documenting the C-02 Dokploy-abort intent.

### src/lib/reviews-r02-gate.test.ts
Minor (2-line) adjustment for schema-dts typing compatibility — no behavior change.

## Deviations from Plan

**Closeout written by orchestrator.** The executor subagent committed all four task commits (RED-first order intact) but its final turn truncated before writing this SUMMARY and updating STATE/ROADMAP. The orchestrator independently re-verified the working tree (clean), commits (present, correct order), tests (32 + 189 pass), tsc, and the `next build` deploy gate (green) before writing this closeout. No implementation gap — only the doc artifacts were missing.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-02-07 mitigated | next.config.ts | invalid schema aborts PHASE_PRODUCTION_BUILD (C-02) |
| T-02-08 mitigated | schema-invariants.ts | cross-tenant `@id` uniqueness (I-02) asserted across full TENANT_REGISTRY |
| T-02-09 mitigated | next.config.ts | validator chain fully static-import — Docker `.ts` resolution safe |
| T-02-SC mitigated | package.json | schema-dts legitimacy verified at blocking human checkpoint before install |

## Self-Check

### Created files exist
- `src/config/schema-invariants.ts`
- `src/config/schema-invariants.test.ts`
- `.planning/phases/02-schema-completeness-correctness/02-03-SUMMARY.md` — this file

### Commits exist
```
0ca1709 feat(02-03): wire assertSchemaInvariants into next.config.ts build guard
4800cd0 feat(02-03): implement schema-invariants module — GREEN
46c0622 test(02-03): RED — schema-invariants failing tests before implementation
b109f1b feat(02-03): add schema-dts@2.0.0 typing to all seo.ts builders
```

## Self-Check: PASSED
