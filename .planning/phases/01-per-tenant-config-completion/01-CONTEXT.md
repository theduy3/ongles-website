# Phase 1: Per-Tenant Config Completion - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Every tenant has complete, correct **NAP + hours + full priced service menu** in static config (`src/config/tenants/{id}/`), plus a **completeness guard** that prevents incomplete config from deploying. This is the hard prerequisite gate — it unblocks all downstream schema (Phase 2) and content (Phase 3+) work, which emit facts that must exist first.

**In scope:** Filling the 15+ secondary-tenant config TODOs (ongles-charlesbourg, ongles-rivieres) with real values; a config-completeness validator + bun:test + prebuild wiring.

**Not in scope (other phases):** JSON-LD/schema emission (Phase 2), content/answer blocks (Phase 3), net-new pages (Phase 4), llms.txt depth + GA4 measurement (Phase 5). No per-tenant menu divergence, no new service types, no tenant onboarding beyond the three existing brands.

</domain>

<decisions>
## Implementation Decisions

### Data Sourcing
- **D-01:** The user supplies all unconfirmed real-world values (SalonX storeId, gift-cert URL, Google Maps CID, exact geo coords, contact email). Claude does **not** guess or derive any field — even "safe" ones like geocoded coords.
- **D-02:** Handoff is **checklist-first**: Phase 1 produces a per-tenant data-request checklist (every empty required field for Charlesbourg + Rivières, labeled), the user fills it offline, then execution consumes it. The checklist is a Phase-1 deliverable — see `01-DATA-CHECKLIST.md`.
- **D-03:** Both **ongles-charlesbourg AND ongles-rivieres are live** tenants in full scope this phase — same completeness bar for both. (ongles-maily is already complete and serves as the reference/source tenant; `template/` is the clone source, excluded.)

### Pricing Model
- **D-04:** Service prices are **distinct per location**. The mirrored ongles-maily prices in Charlesbourg/Rivières `services.ts` are placeholders — real per-tenant `price`/`priceTo` come from the checklist.
- **D-05:** The **service catalog is identical across tenants** (the 4 services: `pose-ongles`, `remplissage`, `soins-mains`, `soins-pieds`). Only the price numbers vary per tenant. No per-tenant menu add/drop. (The `ServiceId` union in `src/config/types.ts` stays as-is.)

### "Complete" Definition (completion bar)
- **D-06:** Phase passes when the **required-core** is real for both Charlesbourg + Rivières. Required-core = name, address (all fields), phone, hours/hoursSpec, **per-service price/priceTo**, **geo coords (real, not approximate)**, **SalonX storeId**, **contact email**.
- **D-07:** **Google Maps CID is required-if-exists**: real when the tenant has a live Google Business Profile; if no GBP exists yet, it is documented-deferred with a safe fallback (schema must omit the `sameAs`/`@id` linkage cleanly — no empty string, no placeholder). Phase 1 is **not** blocked on creating GBPs.
- **D-08:** Gift-certificate URL (and any other genuinely-unavailable optional field) is **deferred-OK** with a safe fallback + a documented gap. No required-core field may fall back to a placeholder, empty string, or undefined.

### Completeness Guard
- **D-09:** Add a **pure config-completeness validator** that iterates **all of `TENANT_REGISTRY`** (not just the build-time `process.env.TENANT`) and fails when any tenant has an empty required-core field. It encodes the exact bar in D-06/D-07/D-08 (required-core hard, Maps CID required-if-exists, gift-cert exempt).
- **D-10:** The validator is enforced two ways: (a) a **bun:test** (`src/*.test.ts` convention) for fast local/PR feedback, and (b) a **prebuild hook** so an incomplete required-core **fails the build and aborts the Dokploy deploy**. This is the strong guard given there is no GitHub-Actions CI gate before deploy.

### Claude's Discretion
- Validator implementation shape (e.g. zod schema over the tenant types vs. an explicit required-field list), file location, and exact prebuild wiring (`prebuild` npm script vs. `next.config.ts` hook) are left to research/planning — only the behavior in D-09/D-10 is locked.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 1" — goal + 4 success criteria (the verification target)
- `.planning/REQUIREMENTS.md` — CONFIG-01 (NAP+hours per tenant), CONFIG-02 (full priced service menu, clears 15+ TODOs)
- `.planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md` — the per-tenant data the user fills offline (D-02); execution consumes this

### Codebase constraints
- `.planning/codebase/CONCERNS.md` §"TODO/FIXME — Tenant Configuration Gaps" — exact TODO inventory + files
- `.planning/PROJECT.md` §Constraints — multi-tenant rules (never hardcode tenant data; resolve via `getStoreConfig()`/`resolveTenant()`), `force-dynamic` mandate, Dokploy deploy model
- `src/config/tenants/ongles-maily/` — the complete reference tenant (gold-standard shape to match)
- `src/config/types.ts` — `Service`, `Location`, `TenantSite` type contracts the configs must satisfy
- `tasks/seo-action-plan.md` — prior 2026-05-22 SEO audit (80/100); don't re-propose already-closed items

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/config/tenants/ongles-maily/`** — complete reference tenant; copy its field structure/coverage as the completeness baseline for the validator.
- **`src/config/index.ts`** — `TENANT_REGISTRY` (line 15) is the authoritative tenant list; `resolveTenant()` already throws on unknown tenant. The validator iterates `TENANT_REGISTRY` keys.
- **`src/config/types.ts`** — `Service` (price/priceTo), `Location` (address/phone/hours/hoursSpec/geo/bookerSlug), `TenantSite` (storeId/contact/reviews/geo/hours/socialProfiles) define exactly which fields exist to validate.
- **bun:test convention** — `package.json` `test` script = `bun test src/`; tests live as `src/*.test.ts`. The validator test fits here.

### Established Patterns
- Per-tenant config is split into `site.ts`, `location.ts`, `services.ts`, `index.ts` per tenant dir — fill in place, don't restructure.
- Hours carry dual representation: human `hours[]` (FR display labels) + `hoursSpec[]` (schema.org 24h). Both must stay consistent when filling.
- Zod is the project's validation idiom (per coding-style) — candidate for the validator, at Claude's discretion (D-10 discretion note).

### Integration Points
- **No `prebuild` script exists** — `package.json` scripts are dev/build/start/lint/test/test:e2e/fetch:reviews. The guard requires adding a `prebuild` step (npm/bun auto-runs `prebuild` before `build`) or a `next.config.ts` build-time hook. This is the new wiring D-10 introduces.
- **Build-vs-runtime nuance:** `types.ts` notes TENANT is selected at build time (`tenant = resolveTenant(process.env.TENANT)`), while tenant routes are `force-dynamic` at runtime. The validator must check **every** registry entry independent of `process.env.TENANT`, so a build for one tenant still catches another tenant's incomplete config.
- **Maps CID placement:** the `@id`/`sameAs` GBP linkage lives in `TenantSite` (socialProfiles / a GBP field) — confirm exact key during planning; D-07 fallback must make schema omit it cleanly.

</code_context>

<specifics>
## Specific Ideas

- ongles-maily is the explicit "this is what complete looks like" reference — match its field coverage exactly.
- The TODO comments themselves (`// TODO: confirm ...`) in Charlesbourg/Rivières `site.ts`/`location.ts`/`services.ts` are the precise field inventory for the checklist — each TODO maps to one checklist line.

</specifics>

<deferred>
## Deferred Ideas

- **Per-tenant service menus** (locations offering different service catalogs) — explicitly rejected for this milestone (D-05); revisit only if a salon's offering genuinely diverges. Not a phase.
- **Salon cross-promo in `SalonCard`** (`src/components/SalonCard.tsx:182`) — sibling-domain discovery; noted in CONCERNS.md as low-priority post-launch, outside config completion.
- **Monitored/automated Google reviews fetch** (CONCERNS.md) — review-data stub handling is Phase 2's SCHEMA-04 concern, not config completion.

</deferred>

---

*Phase: 1-Per-Tenant Config Completion*
*Context gathered: 2026-06-17*
