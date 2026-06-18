---
phase: 02-schema-completeness-correctness
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/config/types.ts
  - src/config/tenants/ongles-maily/google-reviews.json
  - src/config/tenants/ongles-charlesbourg/google-reviews.json
  - src/config/tenants/ongles-rivieres/google-reviews.json
  - src/config/tenants/template/google-reviews.json
  - src/config/tenants/ongles-maily/index.ts
  - src/config/tenants/ongles-charlesbourg/index.ts
  - src/config/tenants/ongles-rivieres/index.ts
  - src/config/tenants/template/index.ts
  - src/lib/reviews.ts
  - src/lib/seo.ts
  - scripts/fetch-google-reviews.mjs
autonomous: true
requirements: [SCHEMA-04]
must_haves:
  truths:
    - "AggregateRating is absent from organizationGraph output when a tenant's reviewData.fetchedAt is null"
    - "AggregateRating is absent when reviewData.aggregate.reviewCount < 5"
    - "Review data resolves per-tenant — fetching reviews for one tenant cannot enable the rating gate for another tenant"
    - "AggregateRating appears with correct values only when fetchedAt is set AND reviewCount >= 5"
  artifacts:
    - path: "src/config/tenants/ongles-maily/google-reviews.json"
      provides: "Per-tenant review data stub (fetchedAt null, aggregate 0/0)"
      contains: "fetchedAt"
    - path: "src/lib/reviews.ts"
      provides: "Per-tenant review accessor reading tenant.reviewData"
      contains: "tenant.reviewData"
  key_links:
    - from: "src/lib/seo.ts organizationGraph"
      to: "tenant.reviewData gate (fetchedAt + reviewCount)"
      via: "hasRealRating condition"
      pattern: "reviewCount\\s*>=\\s*5"
    - from: "src/lib/reviews.ts"
      to: "src/config/tenants/{id}/google-reviews.json"
      via: "tenant.reviewData static import"
      pattern: "reviewData"
---

<objective>
Make Google review data per-tenant and gate AggregateRating against stub data so no tenant ever emits an unbacked salon rating. This is the highest-risk schema slice (review-spam manual-action penalty) and the correctness floor every later slice builds on.

Purpose: Closes SCHEMA-04 (R-01/R-02/R-03/R-04). Eliminates the split-brain bug where the AggregateRating gate is read from a GLOBAL `src/data/google-reviews.json` while values come from per-tenant config — meaning a fetch for maily currently enables ratings for charlesbourg/rivieres simultaneously.
Output: `reviewData` field on every tenant, per-tenant `google-reviews.json` stubs, rewritten `src/lib/reviews.ts`, the `reviewCount >= 5` gate in `seo.ts`, and a tenant-aware `fetch:reviews` script.
</objective>

## Phase Goal (user story)

**As a** prospective client searching Google or asking an AI assistant about a salon, **I want to** see a salon's star rating only when it is real and backed by genuine reviews, **so that** the structured data I (and answer engines) rely on is trustworthy and the salon is never penalized for fabricated ratings.

After this plan, a real user can: load any tenant's home page and the JSON-LD either shows a genuine AggregateRating (when ≥5 fetched reviews exist) or correctly omits it (stub data) — per tenant, with no cross-tenant bleed.

## Artifacts this phase produces (this plan)

- `reviewData: ReviewData` field added to `TenantConfig` (new `ReviewData` type in `src/config/types.ts`).
- Per-tenant `src/config/tenants/{id}/google-reviews.json` (maily, charlesbourg, rivieres, template) — stub `{ fetchedAt: null, aggregate: { ratingValue: 0, reviewCount: 0 }, reviews: [] }`.
- Rewritten `src/lib/reviews.ts` exporting `reviews`, `aggregate`, `reviewsFetchedAt` from `tenant.reviewData`.
- `hasRealRating` gate in `seo.ts organizationGraph` (R-02: `fetchedAt !== null && aggregate.reviewCount >= 5`).
- Tenant-aware `scripts/fetch-google-reviews.mjs` (writes to `src/config/tenants/${TENANT}/google-reviews.json`).

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md
@.planning/phases/02-schema-completeness-correctness/02-RESEARCH.md
@.planning/phases/02-schema-completeness-correctness/02-VALIDATION.md

@src/lib/reviews.ts
@src/lib/seo.ts
@src/config/types.ts
@src/config/index.ts
@src/config/tenants/ongles-maily/index.ts
@src/data/google-reviews.json
@scripts/fetch-google-reviews.mjs

# Non-standard Next.js — read before touching build-flow code
@node_modules/next/dist/docs/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add per-tenant ReviewData type + stubs + wire into TenantConfig</name>
  <read_first>
    - src/config/types.ts (TenantConfig at lines 99-104; TenantSite.reviews at 72-77 — KEEP for display)
    - src/config/tenants/ongles-maily/index.ts (the `as const` export pattern to extend)
    - src/data/google-reviews.json (the exact stub shape to copy per-tenant)
    - src/config/index.ts (TENANT_REGISTRY — all four tenants: maily, charlesbourg, rivieres, template)
  </read_first>
  <action>
    Add a `ReviewData` type to src/config/types.ts shaped `{ fetchedAt: string | null; aggregate: { ratingValue: number; reviewCount: number }; reviews: readonly unknown[] }`. Keep types.ts free of @/lib imports (define a structural ReviewData here, do not import the Review type from reviews.ts). Add `reviewData: ReviewData` to `TenantConfig` (per Q2 static-import recommendation). Create `src/config/tenants/{id}/google-reviews.json` for ALL FOUR tenants (ongles-maily, ongles-charlesbourg, ongles-rivieres, template) with the stub `{ "fetchedAt": null, "aggregate": { "ratingValue": 0, "reviewCount": 0 }, "reviews": [] }` — identical to the current global stub. In each tenant `index.ts`, add `import reviewData from "./google-reviews.json"` and include `reviewData` in the exported config object. Do NOT remove `TenantSite.reviews` — it stays as display defaults (per R-03 research note). This is the static-import approach (no dynamic require), consistent with how every other per-tenant asset resolves; it preserves the SWC require-hook compatibility the build guard depends on.
  </action>
  <verify>
    <automated>bun -e "import('./src/config/index.ts').then(m=>{for(const[id,c]of Object.entries(m.TENANT_REGISTRY)){if(!c.reviewData||!('fetchedAt' in c.reviewData))throw new Error('missing reviewData on '+id)}console.log('reviewData present on all tenants')})"</automated>
  </verify>
  <acceptance_criteria>
    - `ReviewData` type exists in types.ts; `TenantConfig.reviewData` is a required field.
    - All four tenants have a `google-reviews.json` stub and import it into their `index.ts` export.
    - `bunx tsc --noEmit` reports no new errors attributable to reviewData wiring.
  </acceptance_criteria>
  <done>Every entry in TENANT_REGISTRY exposes a `reviewData` object with `fetchedAt`, `aggregate`, `reviews`; types compile.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Rewrite reviews.ts per-tenant + add R-02 reviewCount gate in seo.ts</name>
  <read_first>
    - src/lib/reviews.ts (current global import at line 2 — the split-brain root)
    - src/lib/seo.ts lines 14, 202-215 (current `reviewsFetchedAt` gate in organizationGraph)
    - 02-RESEARCH.md §Q2 Deep Dive (R-02 gate: fetchedAt !== null && aggregate.reviewCount >= 5)
    - src/config/index.ts (the `tenant` singleton export)
  </read_first>
  <behavior>
    - Given a tenant whose reviewData.fetchedAt is null then organizationGraph output has NO `aggregateRating` key (suppressed).
    - Given fetchedAt set but reviewData.aggregate.reviewCount = 4 (less than 5) then NO `aggregateRating` key (suppressed).
    - Given fetchedAt set AND reviewCount = 5 then `aggregateRating` present with ratingValue/reviewCount from reviewData.aggregate.
    - The R-02 gate reads the AUTHORITATIVE reviewCount from `tenant.reviewData.aggregate`, NOT from the static `cfg.site.reviews` display field.
  </behavior>
  <action>
    Rewrite src/lib/reviews.ts to read from `tenant.reviewData` (import `{ tenant } from "@/config"`) instead of `@/data/google-reviews.json`. Export `reviews`, `aggregate` (`{ ratingValue, reviewCount }`), and `reviewsFetchedAt` from `tenant.reviewData`. In src/lib/seo.ts `organizationGraph`, replace the bare `reviewsFetchedAt` gate with a `hasRealRating` const equal to `reviewsFetchedAt !== null && aggregate.reviewCount >= 5` (import `aggregate` from `@/lib/reviews`; use `aggregate.reviewCount` as the authoritative count per R-02, NOT `cfg.site.reviews.reviewCount`). When `hasRealRating`, emit `aggregateRating` with `ratingValue`/`reviewCount` from `aggregate` and `bestRating` from `cfg.site.reviews.bestRating`. Keep the existing honest-structured-data comment intent. Note the module-level singleton pitfall (RESEARCH pitfall 2): plan 02-03's invariant module will call builders with explicit per-tenant configs rather than relying on this singleton — this task only fixes the default-tenant path. Do NOT delete `src/data/google-reviews.json` yet (cleanup deferred; it is now unused by reviews.ts).
  </action>
  <verify>
    <automated>bun -e "import('./src/lib/seo.ts').then(async m=>{const{tenant}=await import('./src/config/index.ts');const g=m.organizationGraph('fr',{name:tenant.site.name,description:'x'});const biz=g['@graph'].find(n=>n['@id']&&String(n['@id']).endsWith('#business'));const has='aggregateRating' in biz;const fa=tenant.reviewData.fetchedAt;const rc=tenant.reviewData.aggregate.reviewCount;const expected=fa!==null&&rc>=5;if(has!==expected)throw new Error('gate wrong: has='+has+' expected='+expected);console.log('R-02 gate correct: aggregateRating present='+has)})"</automated>
  </verify>
  <acceptance_criteria>
    - reviews.ts imports from `@/config` (tenant.reviewData), not `@/data/google-reviews.json`.
    - organizationGraph suppresses `aggregateRating` for the stub default tenant (fetchedAt null).
    - The gate uses `aggregate.reviewCount >= 5` (authoritative fetched count), citing R-02.
    - `bun test src/` shows no regressions.
  </acceptance_criteria>
  <done>Default-tenant organizationGraph correctly omits aggregateRating under stub data; gate logic matches R-02; full bun test suite green.</done>
</task>

<task type="auto">
  <name>Task 3: Make fetch:reviews tenant-aware</name>
  <read_first>
    - scripts/fetch-google-reviews.mjs (hardcoded OUT path ~lines 20-26)
    - 02-RESEARCH.md §Q2 (fetch:reviews change + pitfall 6: log target tenant)
  </read_first>
  <action>
    Edit scripts/fetch-google-reviews.mjs so the output path is `src/config/tenants/${TENANT}/google-reviews.json`, reading `const tenantId = process.env.TENANT ?? "ongles-maily"`. Add a startup log line `[reviews] writing to tenant: ${tenantId}` (per RESEARCH pitfall 6 — make the target visible on missing TENANT). Update the script header comment to document `TENANT=<id> bun run fetch:reviews`. Do not change the Google API fetch logic or credential handling. Match the existing script's import/style conventions.
  </action>
  <verify>
    <automated>grep -q 'tenants' scripts/fetch-google-reviews.mjs && grep -qE 'process\.env\.TENANT' scripts/fetch-google-reviews.mjs && grep -q 'writing to tenant' scripts/fetch-google-reviews.mjs && echo "fetch script tenant-aware" || (echo "FAIL: tenant-aware path/log missing" && exit 1)</automated>
  </verify>
  <acceptance_criteria>
    - Output path derives from `process.env.TENANT` (default ongles-maily) under `src/config/tenants/${TENANT}/`.
    - Startup log prints the target tenant id.
    - Google fetch/credential logic unchanged.
  </acceptance_criteria>
  <done>`fetch:reviews` writes the active tenant's per-tenant file and logs the target tenant id.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| static tenant config / fetched review JSON → `<script type="application/ld+json">` | Tenant-controlled string values reach the server-rendered JSON-LD payload |
| Google Reviews API → `src/config/tenants/{id}/google-reviews.json` | External fetched data is written to a committed file consumed by schema builders |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Information disclosure / Integrity | AggregateRating emitting unbacked stub ratings | mitigate | R-02 gate (`fetchedAt !== null && reviewCount >= 5`) verified by Task 2 automated test; stub data suppresses rating entirely |
| T-02-02 | Tampering | Cross-tenant review bleed via global file | mitigate | Per-tenant `reviewData` + per-tenant fetch path (Tasks 1+3) remove the shared global gate |
| T-02-03 | Tampering (XSS via JSON-LD) | review author/text strings rendered into `<script application/ld+json>` | accept | `JsonLd.tsx` emits `JSON.stringify(data)`; `</script>` cannot appear unescaped from JSON.stringify of object values, and review data is operator-fetched from Google API (trusted source), not free user input. Flag: if per-review schema is later emitted with raw author text, re-evaluate `</` escaping. |
| T-02-SC | Tampering | npm/pip/cargo installs | mitigate | No package installs in this plan (pure source + JSON edits); no `[ASSUMED]`/`[SUS]` packages introduced |
</threat_model>

<verification>
- `bun test src/` — full suite green (no regressions).
- `bunx tsc --noEmit` — clean (reviewData wiring compiles).
- Default-tenant `organizationGraph` omits `aggregateRating` under stub data (Task 2 automated check).
- All four tenants expose `reviewData` (Task 1 automated check).
- `fetch:reviews` resolves per-tenant output path (Task 3 grep check).
</verification>

<success_criteria>
- SCHEMA-04 satisfied: AggregateRating suppressed when `fetchedAt` null OR `reviewCount < 5`, per tenant, with no cross-tenant bleed (R-01/R-02/R-03/R-04).
- Service nodes keep `provider: { @id }` and carry NO copied rating value (R-01 — unchanged, confirmed not regressed).
- Site remains deployable (build-guard slice 02-03 adds enforcement; this plan leaves the suite + tsc green).
</success_criteria>

<output>
Create `.planning/phases/02-schema-completeness-correctness/02-01-SUMMARY.md` when done.
</output>
