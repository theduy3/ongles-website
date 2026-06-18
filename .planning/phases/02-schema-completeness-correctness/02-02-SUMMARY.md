---
phase: 02-schema-completeness-correctness
plan: "02"
subsystem: schema-org-json-ld
tags: [schema-org, canonical-id, organization, seo, multi-tenant]
dependency_graph:
  requires: [02-01]
  provides: [stable-canonical-ids, organization-brand-node, conditional-sameAs]
  affects: [src/lib/seo.ts, src/config/types.ts, tenant-site-configs]
tech_stack:
  added: []
  patterns:
    - "canonicalUrl field on TenantSite — excluded from SiteSectionSchema override surface"
    - "Brand Organization node as first @graph member (O-01)"
    - "Conditional sameAs spread (I-03) — never emit sameAs: []"
key_files:
  created: []
  modified:
    - src/config/types.ts
    - src/config/tenants/ongles-maily/site.ts
    - src/config/tenants/ongles-charlesbourg/site.ts
    - src/config/tenants/ongles-rivieres/site.ts
    - src/config/tenants/template/site.ts
    - src/lib/seo.ts
    - src/lib/seo.test.ts
decisions:
  - "canonicalUrl structurally excluded from SiteSectionSchema (.strict()) — Supabase override cannot destabilise @id URIs (I-01 / T-02-04)"
  - "Organization brand node placed FIRST in @graph — Google prefers entity declaration before referencing nodes"
  - "sameAs applied to both Organization and NailSalon nodes conditionally — consistent entity surface"
  - "servicesGraph/serviceGraph provider @id also moved to canonicalUrl for cross-graph @id consistency"
  - "seo.test.ts fixture extended with distinct canonicalUrl to explicitly verify @id != site.url"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-18T22:40:57Z"
  tasks_completed: 2
  files_changed: 7
---

# Phase 02 Plan 02: Canonical @id + Organization Brand Node Summary

**One-liner:** Per-tenant `canonicalUrl` decouples all schema.org `@id` URIs from the runtime-overridable `site.url`, and a new top-level `Organization` brand node links every `NailSalon` via `parentOrganization`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add canonicalUrl to TenantSite + per-tenant values | 7d6d0ab | types.ts, 4× site.ts |
| 2 | Derive all @id from canonicalUrl + Organization node + conditional sameAs | 1667356 | seo.ts, seo.test.ts |

## Verification Evidence

### Task 1 — canonicalUrl check
```
canonicalUrl present, no trailing slash, unique across non-template tenants
```

### Task 2 — Organization / canonical @id / parentOrganization / sameAs check
```
Organization node + canonical @id + parentOrganization + conditional sameAs OK
```

### Test suite
```
157 pass
0 fail
257 expect() calls
Ran 157 tests across 26 files. [171.00ms]
```

### TypeScript
`bunx tsc --noEmit` — zero new errors. Pre-existing `bun:test` TS2307 errors (30 files) confirmed present on baseline before this plan; unchanged.

## What Changed

### src/config/types.ts
Added `canonicalUrl: string` to `TenantSite` with doc comment explaining I-01 intent (stable origin for `@id`, excluded from override surface).

### Tenant site files (4)
- `ongles-maily`: `canonicalUrl: "https://onglesmaily.com"`
- `ongles-charlesbourg`: `canonicalUrl: "https://www.onglescharlesbourg.com"`
- `ongles-rivieres`: `canonicalUrl: "https://www.onglesrivieres.com"`
- `template`: `canonicalUrl: "https://example.com"` (placeholder)

`canonicalUrl` intentionally matches `url` for all active tenants — the field exists to remain stable when `url` is overridden at runtime by Supabase admin config.

### src/lib/seo.ts — organizationGraph
- `CANONICAL = cfg.site.canonicalUrl` (new local)
- `ORGANIZATION_ID = ${CANONICAL}/#organization` (new)
- `BUSINESS_ID = ${CANONICAL}/#business` (was `cfg.site.url`)
- `WEBSITE_ID = ${CANONICAL}/#website` (was `cfg.site.url`)
- Per-location `@id` in `departments`: `${CANONICAL}/#location-${loc.id}` (was `cfg.site.url`)
- New first `@graph` member: `{ "@type": "Organization", "@id": ORGANIZATION_ID, name, url: cfg.site.canonicalUrl, ...sameAsSpread }`
- `NailSalon` business node gains `parentOrganization: { "@id": ORGANIZATION_ID }`
- `sameAs` replaced with conditional spread: `cfg.site.socialProfiles.length > 0 ? { sameAs: ... } : {}` on both Organization and NailSalon nodes (I-03)
- Human-facing `url:` fields on nodes remain `cfg.site.url` (unchanged — only `@id` moved to canonicalUrl)

### src/lib/seo.ts — servicesGraph + serviceGraph
`BUSINESS_ID` changed from `cfg.site.url` to `cfg.site.canonicalUrl` so the `provider` `@id` reference resolves to the same stable business node.

### src/lib/seo.test.ts
- Injected fixture gains `canonicalUrl: "https://canonical.injected.example.com"` — deliberately distinct from `url` to verify the I-01 contract.
- Test "uses injected site.url in @id" rewritten to "derives @id from canonicalUrl (not runtime site.url) and places Organization first" — asserts `graphArr[0]["@type"] === "Organization"`, correct `@id` values derived from `canonicalUrl`, and business node found by `@id` suffix search.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] seo.test.ts asserted pre-I-01 @id behavior**
- **Found during:** Task 2 — `bun test src/` after implementing Organization node
- **Issue:** The existing DI test at line 46–57 checked `graphArr[0]["@id"]` expecting the business `@id` (old first position) and expected `@id` to contain `injected.example.com` (site.url, not canonicalUrl). Both assertions were invalidated by the new contract.
- **Fix:** Added `canonicalUrl` to the injected fixture (distinct from `url` to make the I-01 contract testable). Rewrote the test to assert Organization is first, and that `@id` values derive from `canonicalUrl` not `site.url`.
- **Files modified:** `src/lib/seo.test.ts`
- **Commit:** 1667356 (included in Task 2 commit)

## Known Stubs

None. All `canonicalUrl` values are real production domains for active tenants. The template value `"https://example.com"` is the correct placeholder for a clone-source file.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-02-04 mitigated | src/config/types.ts | `canonicalUrl` absent from `SiteSectionSchema`; `.strict()` rejects overrides — Supabase admin cannot destabilise `@id` URIs |
| T-02-05 partial | src/config/tenants/*/site.ts | Uniqueness verified by Task 1 check; cross-registry build-guard deferred to plan 02-03 (I-02) |

## Self-Check

### Created files exist
- `.planning/phases/02-schema-completeness-correctness/02-02-SUMMARY.md` — this file

### Commits exist
```
1667356 feat(02-02): canonical @id, Organization brand node, conditional sameAs
7d6d0ab feat(02-02): add canonicalUrl to TenantSite + per-tenant values
```

## Self-Check: PASSED
