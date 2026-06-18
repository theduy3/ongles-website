---
phase: 01-per-tenant-config-completion
plan: 1
type: tdd
wave: 1
depends_on: []
files_modified:
  - src/config/config-completeness.ts
  - src/config/config-completeness.test.ts
  - next.config.ts
autonomous: true
requirements: [CONFIG-01, CONFIG-02]
must_haves:
  truths:
    - "A pure validator function iterates all of TENANT_REGISTRY (excluding template) and reports per-tenant required-core gaps (D-09)"
    - "A bun:test asserts every non-template tenant passes; it is RED now (configs incomplete) and goes GREEN only after Plan 01-2 fills real data (D-10)"
    - "The template tenant is excluded from the completeness bar (D-03)"
    - "next build aborts with non-zero exit when any tenant has incomplete required-core config (D-10), and next dev is NOT blocked"
  artifacts:
    - path: "src/config/config-completeness.ts"
      provides: "Pure zod-based required-core validator; validateAllTenants() + assertAllTenantsComplete()"
      contains: "validateAllTenants"
      exports: ["validateAllTenants", "assertAllTenantsComplete"]
    - path: "src/config/config-completeness.test.ts"
      provides: "bun:test enforcing required-core completeness across tenants"
      contains: "validateAllTenants"
    - path: "next.config.ts"
      provides: "Build guard gated on PHASE_PRODUCTION_BUILD that calls assertAllTenantsComplete()"
      contains: "assertAllTenantsComplete"
  key_links:
    - from: "src/config/config-completeness.ts"
      to: "src/config/index.ts (TENANT_REGISTRY)"
      via: "import TENANT_REGISTRY (not the runtime-resolved `site`/`services` exports)"
      pattern: "TENANT_REGISTRY"
    - from: "next.config.ts"
      to: "src/config/config-completeness.ts"
      via: "await import inside config(phase) under PHASE_PRODUCTION_BUILD"
      pattern: "config-completeness"
    - from: "src/config/config-completeness.test.ts"
      to: "src/config/config-completeness.ts"
      via: "import validateAllTenants"
      pattern: "validateAllTenants"
---

<objective>
Build the config-completeness guard machinery for Phase 1: a single shared, pure
validator function plus a failing bun:test (TDD red) plus the next.config.ts build
guard. This is the enforcement layer that proves Phase 1 "done" — it stays RED until
Plan 01-2 fills real per-tenant data, then turns GREEN.

This plan is fully autonomous: it adds NO real-world data and needs nothing from the
user. It only encodes the D-06/D-07/D-08 completeness bar in code.

Purpose: Establish the strong guard (D-09/D-10) so incomplete required-core config can
never deploy via Dokploy (no GitHub-Actions CI gate exists before deploy).
Output: src/config/config-completeness.ts, src/config/config-completeness.test.ts,
modified next.config.ts.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-per-tenant-config-completion/01-CONTEXT.md
@.planning/phases/01-per-tenant-config-completion/01-RESEARCH.md

# Type contracts the validator schema must align with (required-core fields only):
@src/config/types.ts
# TENANT_REGISTRY — the authoritative tenant list the validator iterates:
@src/config/index.ts
# Reference tenant — gold-standard field coverage the bar mirrors:
@src/config/tenants/ongles-maily/site.ts
@src/config/tenants/ongles-maily/services.ts
@src/config/tenants/ongles-maily/location.ts
# Template placeholder patterns to exclude/detect (storeId "XX", geo 0/0):
@src/config/tenants/template/site.ts
# Existing bun:test convention (import-from-./index is safe; TENANT undefined → maily):
@src/config/resolve-tenant.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write the failing config-completeness bun:test (RED)</name>
  <read_first>
    src/config/resolve-tenant.test.ts (bun:test import convention, safe ./index import),
    src/config/index.ts (TENANT_REGISTRY shape, template entry),
    .planning/phases/01-per-tenant-config-completion/01-RESEARCH.md §"bun:test sketch"
  </read_first>
  <behavior>
    - Test 1: validateAllTenants() returns [] (all non-template tenants pass required-core).
      RED now because Charlesbourg/Rivières carry placeholder/approx values; goes GREEN
      after Plan 01-2 fills real data per D-06.
    - Test 2: the "template" tenant never appears in the failures list — it is excluded
      from the completeness bar (D-03), even though it holds storeId "XX" and geo 0/0.
    - Test 3 (negative guard): a synthetic tenant config with geo {lat:0,lng:0} and
      storeId "XX" produces a non-empty error list — proves the validator actually
      rejects placeholders (covers RESEARCH Pitfalls 2 & 3). Use a small inline object
      passed to an exported single-config check, OR assert on validateAllTenants output
      shape; do not mutate TENANT_REGISTRY.
  </behavior>
  <action>
    Create src/config/config-completeness.test.ts using bun:test (import { test, expect }
    from "bun:test"). Import validateAllTenants (and, if Task 2 exposes it, a single-config
    validator) from "./config-completeness". Write the three tests in <behavior> per D-09/D-10.
    Per D-10 + project TDD norm, this test is authored BEFORE the validator implementation in
    Task 2 and MUST initially fail to compile/run (module does not exist yet) — that is the
    expected RED. Do NOT weaken any assertion to make it pass prematurely. Do NOT add real
    tenant data here (D-01).
  </action>
  <files>src/config/config-completeness.test.ts (created)</files>
  <verify>
    <automated>bun test src/config/config-completeness.test.ts</automated>
  </verify>
  <done>
    bun test src/config/config-completeness.test.ts FAILS (RED) — either because
    config-completeness.ts does not yet exist, or (after Task 2) because Charlesbourg/Rivières
    still hold placeholder data. Failure is expected and correct at this stage.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement the pure config-completeness validator (GREEN for machinery)</name>
  <read_first>
    src/config/config-completeness.test.ts (the contract from Task 1),
    src/config/types.ts (Service/Location/TenantSite required-core fields),
    src/config/index.ts (import TENANT_REGISTRY only — NOT site/services/locations),
    src/lib/store-settings-schema.ts (project zod idiom: `import z from "zod"` default import),
    .planning/phases/01-per-tenant-config-completion/01-RESEARCH.md §"Recommendation: Validator"
  </read_first>
  <action>
    Create src/config/config-completeness.ts as a PURE module — no Next.js imports, no
    process.env reads, no console.log (per coding-style). Follow the RESEARCH validator
    sketch exactly:
    - `import z from "zod"` (default import, project idiom) and import { TENANT_REGISTRY }
      from "./index". Per RESEARCH Pitfall 1, use ONLY TENANT_REGISTRY — never the
      runtime-resolved `site`/`services`/`locations` exports.
    - EXCLUDED_TENANTS = new Set(["template"]) (D-03). Add a one-line code comment on this
      Set documenting the behavior (RESEARCH Open Question 2): any tenant NOT in this set with
      incomplete required-core will FAIL the production build — so a new tenant added before its
      config is filled must either be completed or temporarily added here. Accepted as the
      intended strong-guard behavior for this milestone; a `draft: true` registry flag is
      deferred (not Phase 1 scope).
    - Write a zod schema from scratch covering ONLY required-core (do NOT z.infer from the
      readonly TS types — RESEARCH says they don't map cleanly):
      site.name (min 1), site.url (url), site.storeId (min 1 AND refine v !== "XX" per D-06 +
      Pitfall 3), site.geo.lat/lng (refine !== 0 per D-06 + Pitfall 2), site.contact.email
      (email), site.contact.phone (min 1), site.contact.address.{street,city,region,
      postalCode,country} (each min 1), site.hours (array min 1), location.geo.lat/lng
      (refine !== 0), location.hours (array min 1), location.hoursSpec (array min 1),
      services (array min 1) with each service price/priceTo positive AND priceTo >= price
      (RESEARCH Open Question 4 — add the refine for correctness).
    - D-07 Maps CID required-if-exists: socialProfiles = z.array(z.string()).refine(...) —
      empty array passes (no GBP yet = deferred-OK); any entry containing "google.com/maps"
      MUST match /cid=\d+/. No empty-string or placeholder linkage allowed.
    - D-08 gift-cert: do NOT validate site.booker.giftCertificate at all (deferred-OK).
    - Export `validateAllTenants(): ConfigCompletenessError[]` (iterate TENANT_REGISTRY,
      skip excluded, safeParse each, collect {tenantId, errors[]}; [] = all pass) and
      `assertAllTenantsComplete(): void` (throws a single formatted Error listing every
      failing tenant + field path/message when failures exist; returns silently otherwise).
    - If Task 1 needs a single-config entry point for its negative test, export a small
      `validateTenant(id, config)` or `validateConfig(config)` helper and have
      validateAllTenants use it — keep one source of truth for the schema.
  </action>
  <files>src/config/config-completeness.ts (created)</files>
  <verify>
    <automated>bun test src/config/config-completeness.test.ts 2>&1 | grep -E '[0-9]+ pass|[0-9]+ fail'; echo "EXPECTED at this stage: machinery tests (template-exclusion + placeholder-rejection) PASS; the all-tenants test FAILS (RED) until 01-2 fills data. A fully-green run here = assertions too weak."</automated>
  </verify>
  <done>
    Module compiles and imports cleanly. The template-exclusion test and the negative
    placeholder-rejection test PASS. The "all tenants pass" test still FAILS (RED) because
    Charlesbourg/Rivières data is not yet filled — this is the correct intermediate TDD
    state; it turns GREEN in Plan 01-2. validateAllTenants imports only TENANT_REGISTRY.
  </done>
</task>

<task type="auto">
  <name>Task 3: Wire the build guard into next.config.ts (PHASE_PRODUCTION_BUILD only)</name>
  <read_first>
    next.config.ts (current plain-object export; preserve output/poweredByHeader/turbopack/
    images/headers verbatim),
    src/config/config-completeness.ts (assertAllTenantsComplete),
    .planning/phases/01-per-tenant-config-completion/01-RESEARCH.md §"next.config.ts build guard sketch" + Pitfalls 4 & 5
  </read_first>
  <action>
    Convert next.config.ts from `export default nextConfig` (plain object) to
    `export default async function config(phase: string): Promise<NextConfig>`. Import
    PHASE_PRODUCTION_BUILD from "next/constants". Inside the function, gate on
    `if (phase === PHASE_PRODUCTION_BUILD)` and `await import("./src/config/config-completeness")`
    then call `assertAllTenantsComplete()` (throws → next build exits 1 via printAndExit;
    VERIFIED in RESEARCH build-lifecycle section). Use the dynamic await-import INSIDE the
    function body so the validator never runs at `next dev` startup (Pitfall 4 — dev must not
    be blocked while Plan 01-2 data is mid-fill). Do NOT add a `prebuild` npm script: the
    Dockerfile build stage is node:20-alpine running `npm run build` (Dockerfile line 17), and
    Node 20 cannot transpile the `.ts` config imports a prebuild script would need (RESEARCH
    Pitfall 5); the Next.js SWC require-hooks make next.config.ts the correct execution context.
    Return the SAME config object that exists today (output, poweredByHeader, turbopack, images,
    headers) — surgical change, no behavior drift beyond the guard. Keep securityHeaders as-is.
  </action>
  <files>next.config.ts (modified)</files>
  <verify>
    <automated>bun run dev & DEV_PID=$!; sleep 8; kill $DEV_PID 2>/dev/null; echo "dev started without guard abort (incomplete config tolerated in dev)"</automated>
  </verify>
  <done>
    next.config.ts exports the async function form; imports PHASE_PRODUCTION_BUILD from
    next/constants; calls assertAllTenantsComplete() only under PHASE_PRODUCTION_BUILD via
    await import. `next dev` starts without the guard firing (incomplete config tolerated in
    dev). Production-build abort behavior is verified end-to-end in Plan 01-2 (after data is
    filled, a clean PHASE_PRODUCTION_BUILD=1 build must succeed; before filling it must abort).
    No prebuild script added. Existing config object preserved verbatim.
  </done>
</task>

</tasks>

<artifacts_this_phase_produces>
This plan (01-1) creates/modifies:
- `src/config/config-completeness.ts` — CREATED (pure zod validator, D-09/D-10 bar)
- `src/config/config-completeness.test.ts` — CREATED (bun:test, RED until 01-2)
- `next.config.ts` — MODIFIED (async function form + PHASE_PRODUCTION_BUILD guard)

(Plan 01-2 produces: filled `01-DATA-CHECKLIST.md` + edits to both tenants'
site.ts/location.ts/services.ts.)
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| build pipeline → deploy | Incomplete/placeholder tenant config crossing into a Dokploy deploy is the threat this phase mitigates |
| validator module → TENANT_REGISTRY | Static, in-repo data only; no external/untrusted input |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | tenant config files (placeholder/approx data deploying as real) | mitigate | assertAllTenantsComplete() aborts `next build` (exit 1) on any empty/placeholder required-core field; bun:test catches it pre-PR |
| T-01-02 | Information Disclosure | wrong-tenant data served (geo/NAP mismatch) | mitigate | validator iterates ALL of TENANT_REGISTRY, not just process.env.TENANT — one tenant's build still catches another's gap (D-09) |
| T-01-03 | Denial of Service | guard blocking `next dev` mid-fill | accept→mitigate | gate on PHASE_PRODUCTION_BUILD so dev is never blocked (RESEARCH Pitfall 4) |
| T-01-SC | Tampering | npm/pip/cargo installs | accept | No new packages installed this plan — zod 4.4.3 already in package.json (VERIFIED). No package legitimacy checkpoint needed. |
</threat_model>

<verification>
- `bun test src/config/config-completeness.test.ts` runs; template-exclusion + placeholder-rejection tests PASS; "all tenants pass" test is RED (expected until 01-2).
- `next dev` starts without the guard aborting (dev tolerates incomplete config).
- `grep -v '^#' next.config.ts | grep -c assertAllTenantsComplete` ≥ 1 and `grep -c PHASE_PRODUCTION_BUILD next.config.ts` ≥ 1.
- No real-world tenant data added in this plan (D-01 honored).
</verification>

<success_criteria>
- Shared pure validator exists, imported by BOTH the test and the build guard (one source of truth, D-09).
- Validator encodes exactly D-06 (required-core hard), D-07 (Maps CID required-if-exists), D-08 (gift-cert exempt); template excluded (D-03).
- Build guard aborts production builds on incomplete config and never blocks dev (D-10).
- bun:test is correctly RED (machinery proven via template/placeholder tests), pending data fill in 01-2.
</success_criteria>

<output>
Create `.planning/phases/01-per-tenant-config-completion/01-1-SUMMARY.md` when done.
</output>
