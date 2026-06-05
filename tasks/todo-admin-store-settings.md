<!-- s1 metadata
task-name: admin-store-settings
scope: large
status: complete
repo: /Users/theduy/Repo/maily-website
created-at: 2026-06-05
spec: tasks/spec-admin-store-settings.md
-->

# Admin Store Settings — Implementation Plan

> **Decision (confirmed):** Per-container, **display-only** banner. No runtime store
> switching. Each Dokploy container keeps its build-time `TENANT`; `/admin/settings`
> edits **only this container's** store. Live edits land via a Supabase value-override
> deep-merged over static config at request time (popup pattern). Static-per-domain SEO
> preserved.

**Goal:** `/admin/settings` page that edits the running store's *values* (NAP, hours,
prices, booking URLs, SEO meta, social/reviews) and persists them to Supabase as a
sparse override. Edits go **live without a rebuild**. Structural fields (which services
exist, route paths, nav keys, slugs) stay code-level.

**Architecture:** `static @/config defaults ─┬─ deepMerge ─▶ getStoreConfig() ─▶ pages/SEO`
and `DB store_settings override ─┘` (cached, request-deduped). Mirrors the proven popups
pattern (Supabase-backed, request-time read, static fallback, tenant-scoped).

## Spec corrections (surfaced during planning)
- **Test runner = `bun:test`, NOT vitest.** Repo convention (`src/config/deep-merge.test.ts`).
  Just add a `"test": "bun test"` script — no new dependency.
- **Only `Header.tsx` is a client component.** FloatingCTA / Footer / GiftCards / SalonCard
  are server components → make them `async` + `await getStoreConfig()` directly.
- **`services` merges BY ID,** not via array-replace `deepMerge` (which would drop static
  `slug`/`id`). `getStoreConfig` needs a dedicated services merge.

## Consumer inventory (exact, from grep)
| Area | Files | Migration |
|---|---|---|
| Server pages | `[lang]/{page,about,contact,book-online,reviews,services/page,services/[slug]/page}.tsx`, `checkin/page.tsx`, `queue/page.tsx` | `const {site,locations,services} = await getStoreConfig()` |
| Route handlers | `robots.ts`, `sitemap.ts`, `manifest.ts`, `llms.txt/route.ts` | make `async`, await getStoreConfig |
| Server components | `FloatingCTA`, `Footer`, `GiftCards`, `SalonCard` | make `async`, await getStoreConfig |
| Client component | `Header.tsx` | receive `site` via props from `layout.tsx` |
| Libs | `seo.ts` (36 refs, 7 builders), `locations.ts` (helpers use `site`), `email.ts` | inject `cfg` param (pure/testable) |
| Layout | `[lang]/layout.tsx` | await getStoreConfig; pass props to Header; metadata via getDictionary |
| Type-only (no change) | `ServicePhoto.tsx` (`import type ServiceId`) | none |

---

## Phase 1 — Data layer (TDD, isolated; no consumer changes)

- [x] **T1** Add `"test": "bun test src/"` to `package.json` scripts. **Must scope to `src/`** — bare `bun test` collides with Playwright `e2e/*.spec.ts` (both define global `test()`); Playwright stays on `test:e2e`. Verify `bun run test` runs `deep-merge.test.ts` green. Commit: `chore: add scoped bun test script`.
- [x] **T2** `src/lib/store-settings-schema.ts` — zod `StoreSettingsSchema`: sparse doc, every section (`site`, `location`, `services`, `content`) `.optional()`, value-only (omit `id`/`routes`/`nav[].key`/`slug`). `services` = array of `{ id: ServiceId, price?, priceTo?, photo? }`. Reused for read-parse (`safeParse`) + write-validate, like `PopupSchema`. **Tests first** (`store-settings-schema.test.ts`): accept sparse valid doc, reject structural keys, reject unknown service id. Commit: `feat: zod schema for sparse store-settings override`.
- [x] **T3** `src/lib/store-settings-store.ts` — mirror `popups-store.ts`: `readStoreSettings()` (public, `getSupabasePublic`, `null` on miss/error), `getStoreSettings()` + `upsertStoreSettings(doc)` (admin, `getSupabaseAdmin`, `StoreResult<T>`), all `.eq("tenant_id", tenant.id)`. Add `STORE_SETTINGS_TABLE = "store_settings"` to `supabase.ts`. Single row per tenant (`tenant_id` PK), `doc jsonb`. Commit: `feat: supabase data access for store-settings`.
- [x] **T4** `src/lib/store-config.ts` — async `getStoreConfig(): Promise<{site, locations, services}>` = `deepMerge(staticDefaults, dbOverride)` for `site`/`location`, **merge-by-id for `services`** (override price/priceTo/photo, keep static id/slug). Wrap in React `cache()` (per-request dedupe) **and** `unstable_cache` tag `store-config:${tenant.id}` + short `revalidate`. Fallback to static `@/config` on null/invalid (safeParse). **Tests first** (`store-config.test.ts`): merge precedence, services-by-id preserves slug, null/empty/invalid DB → static defaults. Commit: `feat: getStoreConfig merge layer over static defaults`.

## Phase 2 — Content/dictionary override layer

- [x] **T5** Extend `src/app/[lang]/dictionaries.ts` `getDictionary` to a **3rd layer**: `base → tenant static → DB content override`. Read the `content` section via `readStoreSettings()` (cached, tag `store-content:${tenant.id}`). This is how edited SEO meta (lives in `content.{fr,en}.json`) reaches `generateMetadata`. Preserve locale parity. **Tests** for 3-layer precedence + fallback when DB content absent. Commit: `feat: DB content override as third dictionary merge layer`.

## Phase 3 — Consumer migration (sync static import → async getStoreConfig)

- [x] **T6** `src/lib/seo.ts` — refactor the 7 builders (`pageMetadata`, `organizationGraph`, `servicesGraph`, `serviceGraph`, `faqPageGraph`, `imageGalleryGraph`, `breadcrumbGraph`) to accept an injected `cfg: {site, locations}` param instead of module-level imports (pure → testable, no async creep into pure builders). Move `mapLink` dependence accordingly. **Test** one builder (e.g. `organizationGraph`) to lock the cfg contract. Commit: `refactor: inject store config into seo builders`.
- [x] **T7** `src/lib/locations.ts` helpers (`mapLink`, `bookerServiceMenu`, `mapEmbedUrl`) — take `site`/`loc` as args (drop module `site` import) so overrides apply. Update call sites. Commit: `refactor: pass site into location helpers`.
- [x] **T8** Migrate **route handlers** (`robots.ts`, `sitemap.ts`, `manifest.ts`, `llms.txt/route.ts`) → `async` + `await getStoreConfig()`; pass cfg to any seo builder. Verify each still emits per-tenant output. Commit: `refactor: route handlers read getStoreConfig`.
- [x] **T9** Migrate **server pages** (9 files in inventory) → `const {site,locations,services} = await getStoreConfig()`; feed cfg into seo builders. Commit: `refactor: server pages read getStoreConfig`.
- [x] **T10** Migrate **server components** (FloatingCTA, Footer, GiftCards, SalonCard) → `async`, await getStoreConfig. Commit: `refactor: server components read getStoreConfig`.
- [x] **T11** Migrate **email.ts** → accept `site` param (or await getStoreConfig); update contact/newsletter API callers. Commit: `refactor: email helpers take site config`.
- [x] **T12** `src/app/[lang]/layout.tsx` — `await getStoreConfig()`; pass `site` (or needed fields) as **props to `Header`** (client); `generateMetadata` already async (uses getDictionary + site.url from getStoreConfig). Update `Header.tsx` to consume `site` prop, drop `@/lib/site` import. Commit: `refactor: layout feeds config to client Header via props`.

## Phase 4 — Admin API + UI

- [x] **T13** `src/app/api/admin/settings/route.ts` — `GET` (current override for prefill) + `PUT` (zod-validate → `upsertStoreSettings` → `revalidateTag('store-config:'+tenant.id)` **and** `revalidateTag('store-content:'+tenant.id)`). Auth via existing `guard()` / `admin-http.ts`. Mirror popups route. Commit: `feat: admin settings API (GET/PUT + revalidate)`.
- [x] **T14** `src/app/admin/settings/page.tsx` + `src/components/admin/SettingsForm.tsx` — sectioned form (Brand & SEO · Contact/NAP · Hours · Booking & Gift · Services prices · Social & Reviews), SEO fields per-locale (fr/en). Display-only banner: **"Configuring store: {site.name} — {tenant.id}"**. OG image upload reuses `/api/admin/upload`. Split section components if >400 lines. Commit: `feat: admin store-settings form`.
- [x] **T15** Add a link to `/admin/settings` from `/admin` home (`src/app/admin/page.tsx` header). Commit: `feat: link admin home to store settings`.

## Phase 5 — Migration SQL + E2E + verify

- [x] **T16** Supabase migration: `store_settings` table (`tenant_id text primary key`, `doc jsonb not null`, `updated_at timestamptz`), RLS mirroring `popups` (anon `SELECT`, writes service-role only). Add SQL to repo's migration location + document in deploy notes. Commit: `feat: store_settings table + RLS`.
- [x] **T17** E2E (`tests/` Playwright): login → `/admin/settings` → change a meta title + a service price → save → reload public home → new `<title>` + new price render **without rebuild**. Commit: `test: e2e live store-settings edit`.
- [x] **T18** Full verification: `bun run lint` + `bun test` + `TENANT=ongles-maily/charlesbourg/rivieres bun run build` all green; locale parity intact; manual `bun run dev` edit-confirm. Update `status: complete`.

---

## Safety / fallback (parity with popups)
- DB not configured / error / empty → **static defaults** (site never breaks).
- Invalid DB doc → `safeParse` drops it, logs, falls back to defaults.
- Save path surfaces zod errors loudly in the form.

## Risks
- **Broad async migration** (Phase 3) is the blast radius. Mitigate: migrate area-by-area
  (T7–T12), `bun run build` after each, keep `@/config` as fallback so partial migration
  never breaks a page.
- **`generateStaticParams` + async config**: pages stay statically rendered at build
  (TENANT baked); `unstable_cache` + `revalidateTag` makes DB overrides appear without a
  rebuild via ISR. Confirm a public page picks up an edit in T17.
