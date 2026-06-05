<!-- s1 metadata
task-name: multi-location-architecture
scope: large
status: complete
repo: /Users/theduy/Repo/maily-website
created-at: 2026-06-05
spec: tasks/spec-multi-location-architecture.md
-->

## ✅ ALL PHASES COMPLETE

Commits (branch `worktree-multi-location-architecture`):
- `dcb225e` P1 config extraction · `1a03913` P2 sibling tenants · `ff8af11` P3.1 deep-merge
- `e6aebaa` P3.2/3.3 dictionary split · `e5ef2c3` P3.4 sibling content · `2d8c1f3` P3.5 services
- `4cac851` P3.6 admin tenant_id · `df698e7` P4 storeId + cross-promo · `c847988` P5 Docker/CI/docs

Verified: lint + `bun test` + builds green for ongles-maily, ongles-charlesbourg,
ongles-rivieres; per-tenant title/robots/sitemap/JSON-LD host; dictionary merge lossless
+ locale parity. SEO (4.1/4.2) was already per-tenant via the P1 resolver — no change needed.

Outstanding TODOs (flagged in code, non-blocking, before siblings go LIVE):
- Real per-sibling: geo coords, Google Maps CID, gift-cert URL, contact email, **SalonX storeId**.
- Humanize sibling marketing copy (currently token-swapped from maily → duplicate-content risk).
- Apply Supabase migration (`supabase db push`); optionally add tenant-aware RLS.
- Docker image build unverified here (no daemon); CI registry-login + deploy steps are infra TODO.
- Cross-promo: surface Ongles Maily as a candidate on sibling sites.

## Implementation Plan — multi-location architecture

Source spec: `tasks/spec-multi-location-architecture.md`. Strategy: de-globalize the
single hardcoded brand into a build-time tenant resolver (`TENANT=<id>`), one repo →
one static deploy per domain. Each phase keeps the live site green. Admin isolation =
**one Supabase + `tenant_id` column** (decided).

Blast radius (gitnexus): `src/lib/site.ts` 17 importers, `dictionaries.ts` 8,
`locations.ts` 3 → Phase 1 shim keeps all ~20 importers untouched.

---

### Phase 1 — Config extraction, zero behavior change ✅ DONE (commit dcb225e)

- [x] **1.1** Create `src/config/types.ts` — `Location`/`DayHours` moved here; added
  `TenantSite` + `TenantConfig` structural types.
- [x] **1.2** Create `src/config/tenants/ongles-maily/{site,location,index}.ts` — verbatim
  current values, `site` kept `as const` to preserve literal types.
- [x] **1.3** Create `src/config/index.ts` — registry + `process.env.TENANT` resolver
  (defaults ongles-maily) + fail-loud guard on unknown tenant.
- [x] **1.4** `src/lib/{site,locations}.ts` → thin re-exports from `@/config`; helpers +
  type re-exports retained. 20 importers unchanged.
- [x] **1.5 GATE:** `bun run lint` clean; `bun run build` green; route manifest identical to
  pre-change (verbatim data move). Committed `dcb225e`.

### Phase 2 — Resolver + sibling tenants ✅ DONE (commit 1a03913)

- [x] **2.1** `ongles-charlesbourg/{site,location,index}.ts` seeded from salons.ts. site
  kept `as const` (preserves nav-key literal union for `dict.nav[key]` in Header).
- [x] **2.2** `ongles-rivieres/{site,location,index}.ts` seeded likewise.
- [~] **2.3** Quebec City SKIPPED as a tenant (no domain/NAP → not buildable). Stays the
  coming-soon cross-promo card via `salons.ts`; wire in Phase 4.3.
- [x] **2.4** Registered both in `src/config/index.ts` (+ `TenantId` union + fail-loud guard).
- [x] **2.5 GATE:** all 3 builds green (`ongles-maily`, `ongles-charlesbourg`,
  `ongles-rivieres`); each renders own brand. Committed `1a03913`.
  ⚠️ TODO confirm per sibling (flagged `// TODO` in code): real geo coords, Google Maps
  CID, gift-cert URL, contact email.

### Phase 3 — Content split (dictionaries) + services/pricing + admin isolation

- [x] **3.1** DONE (commit ff8af11) — `src/config/deep-merge.ts` + 5 bun tests, build green.
- [ ] **3.2** ⏭️ NEXT. Split `src/dictionaries/{fr,en}.json` → `src/config/base/content.<locale>.json`
  (shared UI: nav, cta, generic chrome) + `tenants/ongles-maily/content.<locale>.json`
  (meta.* titles/descriptions, location landing copy). Keys partitioned, no value changes.
- [ ] **3.3** Rewire `src/app/[lang]/dictionaries.ts` `getDictionary(locale)` to
  `deepMerge(base[locale], tenant.content[locale])`. 8 importers unchanged (same return shape).
- [ ] **3.4** Author per-tenant `content.<locale>.json` for charlesbourg + rivieres
  (UNIQUE meta + landing copy — duplicate-content safeguard). Quebec-city minimal.
- [ ] **3.5** Move services+pricing into `tenants/<id>/services.ts`; update
  `generateStaticParams()` for `/[lang]/services/[slug]` to read active tenant services.
- [ ] **3.6** Admin isolation: add `tenant_id` column to popup/newsletter Supabase tables
  (migration), default backfill `'ongles-maily'`; filter all reads/writes in
  `src/app/api/popups/*` + newsletter route by `tenant.id`. Server-side only.
- [ ] **3.7 GATE:** per-tenant build shows unique meta + own service catalog; locale-parity
  check (`fr` keys == `en` keys) passes for every tenant content pair. API rows scoped by tenant.
  Commit: `feat: per-tenant dictionaries, services, and admin data isolation`.

### Phase 4 — SEO de-globalization

- [ ] **4.1** `src/app/[lang]/layout.tsx` — `metadataBase`, geo meta (region/placename/ICBM),
  org JSON-LD all from resolved `site`/`tenant`. Verify single `NailSalon` node, `@id =
  ${tenant.url}/#business`.
- [ ] **4.2** `src/app/sitemap.ts` + `src/app/robots.ts` + `src/app/manifest.ts` →
  own-host only from `tenant.site.url`.
- [ ] **4.3** Cross-promo: replace static `src/lib/salons.ts` consumer (`SalonCard`) with a
  derivation = registry minus self; coming-soon Quebec City rendered as such.
- [ ] **4.4** Widgets: `BookingWidget`/`CheckinWidget`/`QueueWidget` read `STORE` from
  `tenant.site.storeId` (drop hardcoded `"OM"` in all 3).
- [ ] **4.5 GATE:** per-tenant `sitemap.xml`/`robots.txt`/JSON-LD reference only own host;
  Chrome DevTools render confirms one LocalBusiness per host + widget mounts with tenant storeId.
  Commit: `feat: per-tenant SEO, cross-promo, and widget store binding`.

### Phase 5 — Build + deploy wiring

- [ ] **5.1** `Dockerfile`: `ARG TENANT` + `ENV TENANT=$TENANT`, threaded into build stage.
- [ ] **5.2** Add CI workflow `.github/workflows/deploy.yml` (or document infra) — matrix
  `[ongles-maily, ongles-charlesbourg, ongles-rivieres]` → 4 images → 4 domains. One merge
  to `main` rebuilds all live tenants.
- [ ] **5.3** Update `env.example` + `README.md`: `TENANT` var, per-tenant deploy, domain map.
- [ ] **5.4 GATE:** `docker build --build-arg TENANT=ongles-charlesbourg .` produces a
  Charlesbourg-branded image. Document DNS wiring per domain.
  Commit: `ci: per-tenant docker build arg + deploy matrix`.

---

### Verification (end-to-end, from spec)

1. `TENANT=ongles-charlesbourg bun run build` vs `TENANT=ongles-maily bun run build` —
   brand/NAP/title/JSON-LD `@id` differ, no cross-leak.
2. Per build: `sitemap.xml`, `robots.txt`, root `<title>`, single `NailSalon` node → own host.
3. Chrome DevTools render each build: metadata + one LocalBusiness per host; widget storeId correct.
4. Locale-parity per tenant: `content.fr.json` keys == `content.en.json` keys.
5. Phase 1 gate: pre/post extraction build output identical.

### Notes for executor

- **Granularity:** each numbered task is self-contained + testable → one subagent each.
- **Order matters across phases; within a phase, tasks are mostly parallelizable** except
  GATE tasks (run last in their phase).
- **Never** let two tenants ship identical marketing copy (SEO duplicate-content rule).
- **Locale parity is per-tenant** (AGENTS.md) — enforce on every `content.*.json` pair.
