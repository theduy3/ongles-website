# Collapse the tenant registries — one seam owns a tenant

> From `/improve-codebase-architecture` (2026-07-01), Candidate 3, grilled.
> Deepening: a tenant's static assets are registered in FOUR places; make the
> tenant's own `index.ts` the single seam and DERIVE the rest.

## Decision (grilled)

- **Seam (Q1):** each tenant `src/config/tenants/<id>/index.ts` also imports its
  `content`/`seo`/`faq` JSON (relative, same folder) and exports them → a
  `TENANT_REGISTRY[id]` entry carries the whole tenant.
- **Scope (Q1):** (b) FULL collapse — all four consumers derive from the registry:
  `tenant-content.ts`, `get-tenant-faq.ts`, AND `schema-invariants.ts` (the 4th
  registration: its 12 relative FAQ/SEO JSON imports → registry reads).
- **Landmine (Q2):** `schema-invariants`'s `TENANT_FAQ`/`TENANT_SEO` hold ONLY the 3
  non-template tenants, and several loops don't filter EXCLUDED_TENANTS. Derivation
  MUST `.filter(([id]) => !EXCLUDED_TENANTS.has(id))` to preserve membership.
- **Gate (Q2):** existing suites (`tenant-content`, `get-tenant-faq`, `config-
  completeness`, `schema-invariants` — 184 tests) are the behavior lock; `bun run
  build` proves the SWC require-hook still resolves the chain. Add one small
  assertion that a registry entry exposes content/seo/faq.

## Build-guard safety (why (b) is safe)

`schema-invariants.ts` is loaded by `next.config.ts` via the SWC require-hook
(relative + alias-free RUNTIME imports only; `import type` erased). It ALREADY
imports `TENANT_REGISTRY` from `./index`. Tenant `index.ts` JSON imports are
relative; tenant modules' only `@/` imports are `import type` (erased). So adding
`.content/.seo/.faq` to the registry introduces NO new alias/runtime dep.

## Steps

1. Extend 4 tenant `index.ts` (maily, charlesbourg, rivieres, template): import +
   export `content:{fr,en}`, `seo:{fr,en}`, `faq:{fr,en}`.
2. `tenant-content.ts`: derive `TENANT_CONTENT`/`TENANT_SEO` from `TENANT_REGISTRY`
   (all 4). Keep BASE_CONTENT/BASE_SEO. Drop 20 JSON imports.
3. `get-tenant-faq.ts`: derive `tenantFaq` from registry (`cfg.faq[locale].items`).
   Keep baseFaq (dictionaries). Drop 8 JSON imports.
4. `schema-invariants.ts`: derive `TENANT_FAQ`/`TENANT_SEO` from registry, FILTERED
   `!EXCLUDED_TENANTS`. Drop 12 JSON imports. Keep base dict imports + casts.
5. Add registry-entry assertion (tenant-content.test or a new tiny test).
6. Verify: `bunx tsc --noEmit`, `bun test src/`, `bun run build`.

## Out of scope

BASE_CONTENT/BASE_SEO (config/base, config/seo) and base FAQ (dictionaries) — not
per-tenant, stay as direct imports.
