---
phase: 02-schema-completeness-correctness
plan: 03
type: tdd
wave: 3
depends_on: ["02-01", "02-02"]
files_modified:
  - package.json
  - src/lib/seo.ts
  - src/config/schema-invariants.ts
  - src/config/schema-invariants.test.ts
  - next.config.ts
autonomous: true
requirements: [SCHEMA-01, SCHEMA-02, SCHEMA-04, SCHEMA-05, SCHEMA-06]
must_haves:
  truths:
    - "bun test src/config/schema-invariants.test.ts passes — all tenants satisfy schema invariants"
    - "next build aborts when any tenant violates a schema invariant (build-guard wired via next.config.ts)"
    - "All JSON-LD builders in seo.ts carry schema-dts compile-time types and tsc --noEmit is clean"
    - "No two tenants in TENANT_REGISTRY share a business @id (I-02 cross-tenant uniqueness)"
  artifacts:
    - path: "src/config/schema-invariants.ts"
      provides: "Offline schema invariant asserter (mirrors config-completeness.ts)"
      exports: ["assertSchemaInvariants", "validateSchemaInvariants"]
    - path: "src/config/schema-invariants.test.ts"
      provides: "bun:test for schema invariants (RED-first then GREEN)"
      contains: "validateSchemaInvariants"
    - path: "next.config.ts"
      provides: "Build-guard call to assertSchemaInvariants under PHASE_PRODUCTION_BUILD"
      contains: "assertSchemaInvariants"
  key_links:
    - from: "next.config.ts"
      to: "src/config/schema-invariants.ts"
      via: "static import + assertSchemaInvariants() under PHASE_PRODUCTION_BUILD"
      pattern: "assertSchemaInvariants"
    - from: "src/config/schema-invariants.ts"
      to: "TENANT_REGISTRY + seo.ts builders"
      via: "per-tenant builder calls with explicit SeoConfig"
      pattern: "TENANT_REGISTRY"
---

<objective>
Type every JSON-LD builder with `schema-dts` and create the offline invariant module that proves schema correctness for every tenant — then wire it into the `next.config.ts` build guard so invalid schema aborts the Dokploy deploy. This is the slice that makes C-02 real: the structural proxy for the manual Rich Results Test.

Purpose: Closes SCHEMA-06 (schema-dts typing + CI enforcement) and adds the offline invariant coverage for SCHEMA-01/02/04/05 (I-02 uniqueness, sameAs, R-02 suppression, Organization presence, AggregateOffer correctness). Depends on 02-01 (reviewData gate) and 02-02 (canonicalUrl `@id` + Organization node) being final so the invariants assert the finished shapes.
Output: `schema-dts@2.0.0` (dev) typing across `seo.ts`, `src/config/schema-invariants.ts` (+ test, RED-first), and the `next.config.ts` guard extension.
</objective>

## Phase Goal (user story)

**As a** developer deploying any tenant via Dokploy, **I want to** have an incomplete or invalid JSON-LD schema abort the production build before it ships, **so that** no tenant can ever go live with a broken `@id`, an empty `sameAs`, an unbacked rating, or a missing Organization node.

After this plan, a real user can: push a schema-breaking change and watch `next build` fail loud with a per-tenant error — exactly as Phase 1's config guard does.

## Artifacts this phase produces (this plan)

- `schema-dts@2.0.0` devDependency.
- `schema-dts` type annotations on `organizationGraph`, `servicesGraph`, `serviceGraph`, `faqPageGraph`, `breadcrumbGraph`, `imageGalleryGraph`, `offer()` (per RESEARCH typing-rollout table).
- `src/config/schema-invariants.ts` exporting `assertSchemaInvariants(): void` and `validateSchemaInvariants(): SchemaInvariantError[]`.
- `src/config/schema-invariants.test.ts` (bun:test, written RED-first).
- `next.config.ts` extended: `assertSchemaInvariants()` under `PHASE_PRODUCTION_BUILD` (static import, alongside `assertAllTenantsComplete`).

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md
@.planning/phases/02-schema-completeness-correctness/02-RESEARCH.md
@.planning/phases/02-schema-completeness-correctness/02-VALIDATION.md
@.planning/phases/02-schema-completeness-correctness/02-01-SUMMARY.md
@.planning/phases/02-schema-completeness-correctness/02-02-SUMMARY.md

@src/lib/seo.ts
@src/config/config-completeness.ts
@src/config/index.ts
@src/config/types.ts
@next.config.ts

# Non-standard Next.js — REQUIRED before touching next.config.ts (SWC require-hook constraint)
@node_modules/next/dist/docs/
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking-human">
  <what-built>Nothing yet — this is a package legitimacy gate BEFORE installing schema-dts@2.0.0. RESEARCH verified `npm view schema-dts version` = 2.0.0 (latest), maintained by Google (google/schema-dts). It is already approved in STATE.md (dev-only, zero runtime cost).</what-built>
  <how-to-verify>
    1. Open https://www.npmjs.com/package/schema-dts and confirm: published by Google, version 2.0.0 exists, repository github.com/google/schema-dts, weekly downloads non-trivial, no deprecation notice.
    2. Confirm it is a devDependency only (TypeScript types — no runtime code ships).
  </how-to-verify>
  <resume-signal>Type "approved" to proceed with `npm install --save-dev schema-dts@2.0.0`, or describe concerns.</resume-signal>
</task>

<task type="auto">
  <name>Task 1: Install schema-dts (dev) + type all seo.ts builders</name>
  <read_first>
    - src/lib/seo.ts (all builders — return-type annotations per RESEARCH typing table lines 411-418)
    - 02-RESEARCH.md §schema-dts Typing Rollout (lines 407-449 — import pattern, `SchemaService` alias, friction points: @graph local interface, dayOfWeek cast, offer() union)
    - package.json (devDependencies section)
  </read_first>
  <action>
    Run `npm install --save-dev schema-dts@2.0.0` (lockfile is package-lock.json → npm per project rule). Add `import type { NailSalon, WebSite, Organization, Service as SchemaService, FAQPage, BreadcrumbList, ItemList, ImageGallery, WithContext } from "schema-dts"` to seo.ts. Annotate return types per the RESEARCH table: `servicesGraph` → `WithContext<ItemList>`, `serviceGraph` → `WithContext<SchemaService>`, `faqPageGraph` → `WithContext<FAQPage>`, `breadcrumbGraph` → `WithContext<BreadcrumbList>`, `imageGalleryGraph` → `WithContext<ImageGallery>`, `offer()` → `AggregateOffer | Offer`. For `organizationGraph`, define a local `SeoGraph` interface `{ "@context": "https://schema.org"; "@graph": Array<NailSalon | WebSite | Organization> }` (schema-dts has no `@graph` wrapper in 2.0.0) and annotate the return. Resolve the documented friction with minimal casts only where required (dayOfWeek `as unknown as DayOfWeek` or widen DAY_NAME; readonly arrays). Do NOT change any runtime behavior — typing only. `Service` from schema-dts conflicts with the local `ServiceItem`; use the `SchemaService` alias.
  </action>
  <verify>
    <automated>bunx tsc --noEmit 2>&1 | tee /tmp/tsc-02-03.log | grep -E "seo\.ts" && (echo "FAIL: seo.ts type errors remain" && exit 1) || echo "tsc clean for seo.ts"; grep -q 'from "schema-dts"' src/lib/seo.ts || (echo "FAIL: schema-dts not imported" && exit 1)</automated>
  </verify>
  <acceptance_criteria>
    - `schema-dts@2.0.0` in devDependencies; lockfile updated.
    - All six builders + `offer()` carry schema-dts return types; `organizationGraph` uses the local `SeoGraph` interface.
    - `bunx tsc --noEmit` clean (no seo.ts errors); runtime behavior unchanged.
  </acceptance_criteria>
  <done>seo.ts is fully typed with schema-dts and compiles clean; no behavioral change.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: schema-invariants module — RED test first, then GREEN implementation</name>
  <read_first>
    - src/config/config-completeness.ts (the analog pattern to mirror: pure, no process.env, EXCLUDED_TENANTS, validate*/assert* pair)
    - 02-RESEARCH.md §Q1 recommended approach (lines 117-135 — the eight invariant assertions) + §Q3 I-02 uniqueness (lines 288-298) + §Build-Guard Wiring (lines 302-401)
    - 02-RESEARCH.md §Pitfall 2 (pass per-tenant SeoConfig into builders — do NOT rely on the module-level reviews singleton)
    - src/lib/seo.ts (organizationGraph / serviceGraph / faqPageGraph signatures + the per-tenant reviewData shape)
  </read_first>
  <behavior>
    Write `src/config/schema-invariants.test.ts` FIRST (must FAIL before the module exists / is complete). Assertions, iterating TENANT_REGISTRY excluding `template`, calling each builder with an explicit per-tenant `SeoConfig` (NOT the module singleton — pitfall 2):
    - `@context === "https://schema.org"` on every graph root.
    - Every `@id` matches `https://{canonicalUrl host}/#business|#location-{id}|#organization`.
    - No cross-tenant business `@id` collision (I-02).
    - `sameAs` absent or non-empty (never `[]`) (I-03).
    - `faqPageGraph(dict.faq.items).mainEntity.length === dict.faq.items.length` for both locales (F-01 lives in plan 02-04, but the count helper may be shared — keep F-01's full assertion in 02-04; here assert only the builder does not drop items for a sample input).
    - AggregateRating absent when a tenant's `reviewData.fetchedAt` null OR `aggregate.reviewCount < 5` (R-02), present when both gates clear (use a synthetic tenant config with fetchedAt set + reviewCount 5 to prove the positive path).
    - Required NailSalon fields present: `name`, `url`, `telephone`, `address`, `geo`, `openingHoursSpecification`.
    - A distinct `Organization` node present in organizationGraph output (O-01).
    - `offer()` emits `AggregateOffer` when `priceTo > price` else `Offer` (SCHEMA-02 — verify, do not change).
    Test entry: `expect(validateSchemaInvariants()).toEqual([])` plus targeted positive/negative cases above.
  </behavior>
  <action>
    Create `src/config/schema-invariants.test.ts` first and run it RED. Then create `src/config/schema-invariants.ts` mirroring config-completeness.ts: pure functions, no `process.env`, no network, static imports only (it will be imported by next.config.ts — SWC require-hook constraint, see Phase 1 lesson). Export `validateSchemaInvariants(): SchemaInvariantError[]` (returns per-tenant error array) and `assertSchemaInvariants(): void` (throws a formatted multi-tenant error when non-empty — same contract as `assertAllTenantsComplete`). Build each tenant's `SeoConfig` from `TENANT_REGISTRY[id]` (site + [location]) and pass it + the tenant's `reviewData` into builder calls so suppression is tenant-correct without env gymnastics (pitfall 2). Use `EXCLUDED_TENANTS = new Set(["template"])`. Iterate to GREEN. Keep the module under 800 lines, small focused helpers per assertion group.
  </action>
  <verify>
    <automated>bun test src/config/schema-invariants.test.ts 2>&1 | tail -20; bun test src/config/schema-invariants.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - Test file existed and FAILED before the implementation was complete (RED→GREEN documented in SUMMARY with commit refs).
    - `validateSchemaInvariants()` returns `[]` for current tenants; negative cases (collision, empty sameAs, unbacked rating) are proven to be caught.
    - Module is pure, static-import-only, no `process.env` reads.
    - `bun test src/config/schema-invariants.test.ts` green.
  </acceptance_criteria>
  <done>schema-invariants module asserts all eight invariant groups for every non-template tenant; test green; RED-first cycle recorded.</done>
</task>

<task type="auto">
  <name>Task 3: Wire assertSchemaInvariants into the next.config.ts build guard</name>
  <read_first>
    - next.config.ts (lines 1-13 static-import constraint comment; lines 48-51 the PHASE_PRODUCTION_BUILD guard)
    - 02-RESEARCH.md §Build-Guard Wiring (lines 302-328) + §Pitfall 1 (dynamic import breaks .ts resolution)
    - tasks/lessons.md (Phase 1 build-guard lessons, if present)
  </read_first>
  <action>
    Add a STATIC import `import { assertSchemaInvariants } from "./src/config/schema-invariants"` to next.config.ts (alongside the existing `assertAllTenantsComplete` import — NEVER a dynamic `import()`, which bypasses the SWC require-hook and breaks `.ts` resolution in Node 20 Docker per pitfall 1). Inside the `if (phase === PHASE_PRODUCTION_BUILD)` block, call `assertSchemaInvariants()` immediately after `assertAllTenantsComplete()`. Mirror the existing comment style documenting why this aborts the Dokploy deploy on invalid schema (C-02). Confirm the entire transitive import chain of schema-invariants.ts is static (no dynamic import anywhere) — it imports TENANT_REGISTRY (index.ts → tenant dirs, already proven static in Phase 1) and seo.ts.
  </action>
  <verify>
    <automated>grep -qE '^import \{ assertSchemaInvariants \}' next.config.ts && grep -q 'assertSchemaInvariants()' next.config.ts && ! grep -qE 'await import\(.*schema-invariants' next.config.ts && echo "static import + guard call present" || (echo "FAIL: guard wiring missing or dynamic" && exit 1); PHASE_TEST=1 bunx next build 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - `assertSchemaInvariants` is statically imported and called under `PHASE_PRODUCTION_BUILD`.
    - No dynamic `import()` in next.config.ts or the schema-invariants transitive chain.
    - `next build` succeeds with current (valid) configs (guard passes, does not falsely abort).
  </acceptance_criteria>
  <done>Production build runs both guards; a schema invariant violation would abort `next build` (exit 1) and the Dokploy deploy.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → devDependencies | `schema-dts@2.0.0` is installed into the build toolchain |
| `next.config.ts` → `.ts` validator chain | SWC require-hook resolves the validator at build time (Node 20 Docker) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-07 | Tampering / Integrity | invalid schema shipping to production undetected | mitigate | `assertSchemaInvariants()` in the PHASE_PRODUCTION_BUILD guard aborts the build (C-02); covers `@id`, sameAs, R-02 suppression, Organization presence |
| T-02-08 | Spoofing | cross-tenant `@id` collision | mitigate | I-02 uniqueness assertion in schema-invariants.ts runs across the full TENANT_REGISTRY at build time |
| T-02-SC | Tampering | `schema-dts@2.0.0` supply chain | mitigate | Blocking human legitimacy checkpoint (npmjs.com verify: Google-published, latest 2.0.0, dev-only/zero-runtime) BEFORE install; never auto-approved |
| T-02-09 | Denial of service (build) | dynamic import in the validator chain breaks Docker `.ts` resolution → build fails | mitigate | Static-import-only constraint enforced by Task 3 verify (`! grep await import`) and RESEARCH pitfall 1 |
</threat_model>

<verification>
- `bun test src/config/schema-invariants.test.ts` green (RED-first recorded).
- `bunx tsc --noEmit` clean (schema-dts typing compiles — SCHEMA-06 compile assertion).
- `bun test src/` full suite green.
- `next build` succeeds with valid configs; guard wired statically (Task 3 checks).
</verification>

<success_criteria>
- SCHEMA-06: schema-dts typing on all builders + invariant CI test + build-guard enforcement (C-01/C-02).
- SCHEMA-01/SCHEMA-05/SCHEMA-04 structurally enforced offline (I-02 uniqueness, Organization presence, R-02 suppression).
- SCHEMA-02: `offer()` AggregateOffer/Offer behavior verified correct (not changed).
- Invalid schema aborts the production build / Dokploy deploy.
</success_criteria>

<output>
Create `.planning/phases/02-schema-completeness-correctness/02-03-SUMMARY.md` when done.
</output>
