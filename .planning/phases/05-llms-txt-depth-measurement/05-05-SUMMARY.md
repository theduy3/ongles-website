---
phase: 05-llms-txt-depth-measurement
plan: 05
subsystem: integration
tags: [llms-txt, ga4, nap, schema-invariants, build-gate, law-25]

# Dependency graph
requires:
  - phase: 05-llms-txt-depth-measurement (plans 01–04)
    provides: TenantSite fields, llms.txt route, GA4/consent layer, conversion events + trust signals
provides:
  - Owner-reviewed ≥200-word llmsDescription prose for all 3 live tenants
  - Three content guards (checkLlmsDepth, checkLlmsLeak, checkNapConsistency) wired build-blocking
  - checkGA4IdPresent as a non-blocking warning (empty GA4 ID allowed)
  - shared-city false-positive fix in checkLlmsLeak (same-city salons may share "Québec")
  - docs/nap-reference.md (N-02) + 05-UAT.md manual checklist
affects: [phase complete — closes Phase 5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Build-blocking content guards via validateSchemaInvariants(); warnings via assertSchemaInvariants() to keep validate pure"
    - "Dependency-injection param (default TENANT_REGISTRY) on guards → seeded gate-bites fixtures without mutating real config"
    - "Cross-tenant leak detection excludes signals shared with the checking tenant (true shared facts ≠ leaks)"

key-files:
  created:
    - docs/nap-reference.md
    - .planning/phases/05-llms-txt-depth-measurement/05-UAT.md
  modified:
    - src/config/tenants/ongles-maily/site.ts
    - src/config/tenants/ongles-charlesbourg/site.ts
    - src/config/tenants/ongles-rivieres/site.ts
    - src/config/schema-invariants.ts
    - src/config/schema-invariants.test.ts

key-decisions:
  - "GA4 measurement IDs left EMPTY this round (owner had none ready). checkGA4IdPresent is warning-only, so build passes; owner pastes real G-XXXXXXXXXX later — no code change needed."
  - "llmsDescription prose drafted by the orchestrator from real config facts and approved by the owner before commit (owner is author of record; nothing committed before approval)."
  - "Fixed a latent checkLlmsLeak bug: two salons in the same city (maily + charlesbourg, both Québec) legitimately share the city signal. The guard now skips signals shared with the checking tenant, flagging only DISTINCTIVE other-tenant landmarks/cities."
  - "Guards gain an optional registry param (DI) so gate-bites tests inject fail-fixtures (short prose / planted landmark) and prove the guard would abort the build."

requirements-completed: [LLMS-01, LLMS-02, LOCAL-01, MEAS-01]

# Metrics
duration: ~1 owner checkpoint + orchestrator inline execution
completed: 2026-06-20
status: complete
---

# Phase 05 Plan 05: Integration + Activation Summary

**Collected owner-approved content, flipped the three llms/NAP guards to build-blocking, and proved the gates bite — closing Phase 5 with a green production build.**

## Performance
- **Completed:** 2026-06-20 (after one human-verify checkpoint)
- **Tasks:** 3 (content + wiring, gate-bites tests, docs + build)

## Accomplishments
- **Content (LLMS-02 / LOCAL-01):** ≥200-word owner-reviewed `llmsDescription` prose for ongles-maily, ongles-charlesbourg, ongles-rivieres — each salon-only, no cross-tenant landmark. GA4 IDs intentionally left empty (none available yet).
- **Guards wired (LLMS-01/02, MEAS-01):** `checkLlmsDepth`, `checkLlmsLeak`, `checkNapConsistency` are now build-blocking via `validateSchemaInvariants()`; `checkGA4IdPresent` emits a `console.warn` from `assertSchemaInvariants()` and never blocks.
- **Leak guard correctness fix:** shared city ("Québec" for two Québec-City salons) is no longer a false-positive leak; only distinctive other-tenant signals trigger LLMS-01.
- **Gate-bites proof:** injected fail-fixtures show the depth guard bites on <200-word prose and the leak guard bites on a planted other-tenant landmark — the build would abort on bad content.
- **Docs:** `docs/nap-reference.md` (canonical NAP, N-02) + `05-UAT.md` (manual GA4 DebugView / consent / conversion / llms.txt checklist).

## Task Commits
1. **Content** — `19a15ed` (prose, 3 configs)
2. **Guards wired + leak fix + DI** — `a34e2ae`
3. **Tests flipped GREEN + gate-bites** — `cb0e9d9`
4. **Docs (NAP + UAT)** — `bb722d8`

## Self-Check: PASSED
- Full unit suite 511/511; schema-invariants + route subset 224/224.
- `next build` exit 0 with guards build-blocking (real prose satisfies them); MEAS-01 GA4 warnings print without aborting.
- Gate-bites tests confirm depth/leak guards are not no-ops.

## Owner follow-ups (non-blocking)
- Create GA4 properties (3 tenants) and paste each `G-XXXXXXXXXX` into `site.ts`.
- Run the `05-UAT.md` manual checklist on each live host after deploy.
