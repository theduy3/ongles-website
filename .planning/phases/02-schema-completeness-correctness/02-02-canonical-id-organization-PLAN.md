---
phase: 02-schema-completeness-correctness
plan: 02
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - src/config/types.ts
  - src/config/tenants/ongles-maily/site.ts
  - src/config/tenants/ongles-charlesbourg/site.ts
  - src/config/tenants/ongles-rivieres/site.ts
  - src/config/tenants/template/site.ts
  - src/lib/seo.ts
autonomous: true
requirements: [SCHEMA-01, SCHEMA-05]
must_haves:
  truths:
    - "Every NailSalon/Organization @id derives from the tenant's stable canonicalUrl, not the runtime-overridable site.url"
    - "organizationGraph emits a distinct top-level Organization brand node with @id ending in #organization"
    - "The NailSalon business node references the brand via parentOrganization @id"
    - "sameAs is omitted entirely (no empty array) when a tenant has no socialProfiles"
  artifacts:
    - path: "src/config/types.ts"
      provides: "canonicalUrl field on TenantSite"
      contains: "canonicalUrl"
    - path: "src/lib/seo.ts"
      provides: "Organization node + canonical @id derivation + conditional sameAs"
      contains: "#organization"
  key_links:
    - from: "src/lib/seo.ts organizationGraph"
      to: "cfg.site.canonicalUrl"
      via: "BUSINESS_ID/LOCATION_ID/ORGANIZATION_ID derivation"
      pattern: "canonicalUrl.*#(business|organization|location)"
    - from: "NailSalon business node"
      to: "Organization brand node"
      via: "parentOrganization @id reference"
      pattern: "parentOrganization"
---

<objective>
Give each tenant a stable, collision-free schema identity and a clean brand entity. Decouple all `@id` URIs from the runtime-overridable `site.url`, add a distinct top-level `Organization` brand node, and stop emitting `sameAs: []`.

Purpose: Closes SCHEMA-01 (stable per-tenant `@id`) and the Organization half of SCHEMA-05. Implements I-01 (canonical-host `@id`), I-03 (omit `sameAs`), O-01 (brand Organization node). Building on 02-01's review-gated graph keeps the business node correct end-to-end.
Output: `canonicalUrl` field on `TenantSite` (+ per-tenant values), all three `@id` forms derived from it, a brand `Organization` node, and conditional `sameAs`.
</objective>

## Phase Goal (user story)

**As a** search engine / AI answer engine indexing the salon, **I want to** resolve each salon to one stable, unique entity URI and a clear brand-to-location hierarchy, **so that** I attribute reviews, services, and locations to the correct salon and never confuse one tenant's entity with another's.

After this plan, a real user can: run Google's Rich Results Test (UAT) on any tenant home page and see a NailSalon with a stable `@id`, a parent Organization brand, and no empty `sameAs` noise.

## Artifacts this phase produces (this plan)

- `canonicalUrl: string` field on `TenantSite` (excluded from Supabase override surface — see threat model).
- Per-tenant `canonicalUrl` values: maily `https://onglesmaily.com`, charlesbourg `https://www.onglescharlesbourg.com`, rivieres `https://www.onglesrivieres.com`, template placeholder.
- `BUSINESS_ID`/`LOCATION_ID`/`ORGANIZATION_ID` in `seo.ts` derived from `canonicalUrl`.
- New brand `Organization` node (first `@graph` member) with `@id` `${canonicalUrl}/#organization`.
- `parentOrganization` link on the business NailSalon node.
- Conditional `sameAs` spread (omitted when `socialProfiles` empty).

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md
@.planning/phases/02-schema-completeness-correctness/02-RESEARCH.md
@.planning/phases/02-schema-completeness-correctness/02-01-SUMMARY.md

@src/lib/seo.ts
@src/config/types.ts
@src/config/tenants/ongles-maily/site.ts
@src/lib/store-config.ts
@src/lib/store-settings-schema.ts

# Non-standard Next.js — read before touching build-flow code
@node_modules/next/dist/docs/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add canonicalUrl to TenantSite + per-tenant values, excluded from override surface</name>
  <read_first>
    - src/config/types.ts (TenantSite, lines 55-97 — add canonicalUrl near `url`)
    - src/config/tenants/ongles-maily/site.ts (existing `url` value to mirror)
    - 02-RESEARCH.md §Q3 Deep Dive (canonicalUrl recommendation + per-tenant values lines 277-280)
    - src/lib/store-settings-schema.ts (SiteSectionSchema is `.strict()` — must NOT add canonicalUrl there)
  </read_first>
  <action>
    Add `canonicalUrl: string` to `TenantSite` in src/config/types.ts with a doc comment: stable production origin for schema.org `@id` URIs, NEVER overridden by Supabase admin config, no trailing slash (per I-01 / Q3). Add per-tenant values: ongles-maily `"https://onglesmaily.com"`, ongles-charlesbourg `"https://www.onglescharlesbourg.com"`, ongles-rivieres `"https://www.onglesrivieres.com"`, template a placeholder (e.g. `"https://example.com"`). Do NOT add `canonicalUrl` to `SiteSectionSchema` in store-settings-schema.ts — it is `.strict()`, so omitting it already rejects any override attempt (assumption A4 resolved: type-system + `.strict()` enforce exclusion). Confirm `deepMerge` in store-config.ts therefore cannot mutate `canonicalUrl`.
  </action>
  <verify>
    <automated>bun -e "import('./src/config/index.ts').then(m=>{const ids=new Set();for(const[id,c]of Object.entries(m.TENANT_REGISTRY)){if(id==='template')continue;if(!c.site.canonicalUrl||/\/$/.test(c.site.canonicalUrl))throw new Error('bad canonicalUrl on '+id);if(ids.has(c.site.canonicalUrl))throw new Error('canonicalUrl collision: '+c.site.canonicalUrl);ids.add(c.site.canonicalUrl)}console.log('canonicalUrl present, no trailing slash, unique across non-template tenants')})"</automated>
  </verify>
  <acceptance_criteria>
    - `canonicalUrl` is a required field on `TenantSite`; all four tenants set it.
    - No trailing slash; unique across non-template tenants.
    - `canonicalUrl` absent from `SiteSectionSchema` (override surface), confirmed `.strict()` rejects it.
  </acceptance_criteria>
  <done>Every tenant has a distinct, trailing-slash-free `canonicalUrl`; it is structurally excluded from the Supabase merge.</done>
</task>

<task type="auto">
  <name>Task 2: Derive all @id from canonicalUrl + add Organization node + conditional sameAs</name>
  <read_first>
    - src/lib/seo.ts lines 140-243 (organizationGraph), 257-296 (servicesGraph/serviceGraph BUSINESS_ID)
    - 02-RESEARCH.md §O-01 wiring (lines 504-529) + §Pitfall 3 (sameAs fix, lines 466-476)
    - 02-RESEARCH.md §Q3 (three @id forms, lines 272-275)
  </read_first>
  <action>
    In src/lib/seo.ts, change every `@id` base from `cfg.site.url` to `cfg.site.canonicalUrl`: `BUSINESS_ID = \`${cfg.site.canonicalUrl}/#business\``, the per-location `LOCATION_ID = \`${cfg.site.canonicalUrl}/#location-${loc.id}\``, and a new `ORGANIZATION_ID = \`${cfg.site.canonicalUrl}/#organization\``. Update `WEBSITE_ID` to canonicalUrl too for consistency. Also update `BUSINESS_ID` in `servicesGraph` and `serviceGraph` (they currently use `cfg.site.url`) so the `provider` link resolves to the same stable business `@id`. Keep human-facing `url:` fields (the node's `url`, department `url`, service `url`) on `cfg.site.url` / mapLink as-is — only `@id` values move to canonicalUrl. Insert a brand `Organization` node as the FIRST `@graph` member: `{ "@type": "Organization", "@id": ORGANIZATION_ID, name: cfg.site.name, url: cfg.site.canonicalUrl, ...(socialProfiles conditional sameAs) }`. Add `parentOrganization: { "@id": ORGANIZATION_ID }` to the top-level NailSalon business node. Replace the unconditional `sameAs: cfg.site.socialProfiles` (line 230) with a conditional spread `...(cfg.site.socialProfiles.length > 0 ? { sameAs: cfg.site.socialProfiles } : {})` on both the business node and the new Organization node (I-03 — never emit `sameAs: []`). Do not change the department/location node structure beyond the `@id` base.
  </action>
  <verify>
    <automated>bun -e "import('./src/lib/seo.ts').then(async m=>{const{tenant}=await import('./src/config/index.ts');const c=tenant.site.canonicalUrl;const g=m.organizationGraph('fr',{name:tenant.site.name,description:'x'});const graph=g['@graph'];const org=graph.find(n=>n['@type']==='Organization');if(!org)throw new Error('no Organization node');if(org['@id']!==c+'/#organization')throw new Error('org @id wrong: '+org['@id']);if(graph[0]!==org)throw new Error('Organization not first @graph member');const biz=graph.find(n=>n['@id']===c+'/#business');if(!biz)throw new Error('business @id not canonical-derived');if(!biz.parentOrganization||biz.parentOrganization['@id']!==org['@id'])throw new Error('parentOrganization link missing');if('sameAs' in biz && (!Array.isArray(biz.sameAs)||biz.sameAs.length===0))throw new Error('sameAs empty array emitted');console.log('Organization node + canonical @id + parentOrganization + conditional sameAs OK')})"</automated>
  </verify>
  <acceptance_criteria>
    - All `@id` URIs (business, website, location, organization) derive from `canonicalUrl`.
    - `servicesGraph`/`serviceGraph` `provider` `@id` resolves to the canonical business `@id`.
    - Organization node is the first `@graph` member with `@id` `${canonicalUrl}/#organization`.
    - Business node carries `parentOrganization` pointing at the Organization `@id`.
    - `sameAs` absent when `socialProfiles` empty; present (non-empty) otherwise.
    - `bun test src/` green; `bunx tsc --noEmit` clean.
  </acceptance_criteria>
  <done>organizationGraph emits a canonical-`@id` business node linked to a distinct Organization brand node; no empty `sameAs`; service provider links resolve to the stable business `@id`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Supabase admin override → `site.url` (runtime) | An admin can mutate `site.url`; `@id` must NOT depend on it |
| static tenant config → `<script application/ld+json>` | Tenant `name`/`canonicalUrl` strings reach the JSON-LD payload |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-04 | Tampering / Integrity | `@id` silently destabilized by a Supabase `site.url` override | mitigate | `@id` derives from `canonicalUrl`, which is absent from the `.strict()` SiteSectionSchema override surface (Task 1) — an override attempt is rejected, not silently merged |
| T-02-05 | Spoofing | cross-tenant `@id` collision (two tenants share an entity URI) | mitigate | Task 1 verify asserts uniqueness across non-template tenants; plan 02-03 adds the build-guard I-02 cross-registry assertion |
| T-02-06 | Tampering (XSS via JSON-LD) | `canonicalUrl`/`name` emitted into `<script application/ld+json>` | accept | Values are operator-controlled static config (not user input); `JsonLd.tsx` uses `JSON.stringify` so embedded `</script>` in a string value cannot break out of the script context for plain JSON object values |
| T-02-SC | Tampering | npm/pip/cargo installs | mitigate | No package installs in this plan; no `[ASSUMED]`/`[SUS]` packages |
</threat_model>

<verification>
- Organization node present, first in `@graph`, `@id` `${canonicalUrl}/#organization` (Task 2 check).
- Business node `@id` canonical-derived; `parentOrganization` link present (Task 2 check).
- No `sameAs: []` for no-GBP tenants (Task 2 check).
- `canonicalUrl` unique across tenants, no trailing slash (Task 1 check).
- `bun test src/` green; `bunx tsc --noEmit` clean.
</verification>

<success_criteria>
- SCHEMA-01: stable per-tenant `@id` decoupled from `site.url`, derived from `canonicalUrl` (I-01).
- SCHEMA-05 (Organization half): distinct brand Organization node; locations/business link via `parentOrganization` (O-01). Breadcrumb coverage (O-02) already met — no new breadcrumb work.
- I-03: `sameAs` omitted entirely when no socialProfiles.
- Site remains deployable; suite + tsc green.
</success_criteria>

<output>
Create `.planning/phases/02-schema-completeness-correctness/02-02-SUMMARY.md` when done.
</output>
