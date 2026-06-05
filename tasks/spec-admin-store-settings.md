# Spec: Admin Store Settings (live, value-level, per-container)

## Context

Each branded store is deployed as its **own Dokploy container** on the VPS, with the
active store baked at **build time** via the `TENANT` build arg (`src/config/index.ts:21`).
Today every store fact — name, NAP, hours, services, pricing, and SEO meta — lives in
**build-time static files** (`src/config/tenants/<id>/{site,location,services}.ts` +
`content.{fr,en}.json`). Changing any of them requires a code edit + redeploy.

The owner wants to **set up / configure the current container's store from `/admin`**,
**including SEO**, with edits going **live without a rebuild** — the same way popups
already work (Supabase-backed, request-time read, static fallback).

Outcome: a `/admin/settings` page that edits the running store's values and persists
them to Supabase as a sparse override deep-merged over the static defaults at request
time. Brand integrity is preserved by keeping **structural** fields (which services
exist, route paths, nav keys) code-level; only **values** are editable.

## Decisions (confirmed)

- **Scope:** Full store setup, but **values only** — no structural edits.
- **Reach:** Manages **only this container's** store (`tenant.id` from build-time `TENANT`).
  The "store selector" is a **display-only banner** showing the current store.
- **Persistence:** **Live DB override** (Supabase) with static fallback — mirrors popups.

## Architecture — Override-merge layer

Static config stays the typed **default/seed**. A new per-tenant Supabase row holds a
**sparse override**. A cached server getter merges them at request time.

```
static defaults (@/config)  ─┐
                             ├─ deepMerge ─▶ getStoreConfig()  ─▶ pages / SEO / schema
DB override (store_settings) ┘   (cached)
```

### New files
- `src/lib/store-settings-schema.ts` — zod `StoreSettingsSchema`: a **sparse** doc where
  each section (`site`, `location`, `services`, `content`) is optional; arrays validated
  whole (deepMerge replaces arrays — `deep-merge.ts:6`). Reused for read-parse
  (`safeParse`, drop-invalid → fallback) and write-validate, exactly like `PopupSchema`.
- `src/lib/store-settings-store.ts` — data access, **mirrors `src/lib/popups-store.ts`**:
  `readStoreSettings()` (public, `getSupabasePublic`, returns `null` on miss),
  `getStoreSettings()` / `upsertStoreSettings(doc)` (admin, `getSupabaseAdmin`,
  `StoreResult<T>`), all scoped to `tenant.id`.
- `src/lib/store-config.ts` — async `getStoreConfig()` returning
  `{ site, locations, services }` = `deepMerge` of static `@/config` defaults + DB
  override. Wrapped in React `cache()` (per-request dedupe) **and** `unstable_cache`
  with tag `store-config:${tenant.id}` + short `revalidate` (cross-request cache).
- `src/app/api/admin/settings/route.ts` — `GET` (current override for form prefill) +
  `PUT` (zod-validate → `upsertStoreSettings` → `revalidateTag('store-config:'+tenant.id)`
  and the content tag). Auth via existing admin session (`session.ts`, `admin-http.ts`).
- `src/app/admin/settings/page.tsx` + `src/components/admin/SettingsForm.tsx` (+ small
  section components if it grows >400 lines).

### Changed files
- `src/app/[lang]/dictionaries.ts` — add a **third merge layer**: `base → tenant static
  override → DB content override`. Make `getDictionary` read the DB content override
  (cached, tagged `store-content:${tenant.id}`). SEO meta lives here today, so this is
  how edited SEO reaches `generateMetadata`.
- All consumers of `@/lib/site`, `@/lib/locations`, `@/lib/services` migrate from the
  **static import** to `const { site } = await getStoreConfig()`. Server components and
  `generateMetadata` are async-friendly; client components keep receiving config via
  **props from the server layout** (feed those props from the getter). `@/config`
  exports remain the fallback default. *(Enumerate exact consumers in `/s1-plan`.)*

## Editable fields (values only)

| Section | Editable | Frozen (code-level) |
|---|---|---|
| Brand/SEO | name, url, storeId, priceRange, per-locale meta title/description, OG image+tags, brand copy keys | `id`, `routes[]`, `nav[].key` |
| Contact/NAP | email, phone, phoneHref, landmark, full address | — |
| Hours | `hours[]` + `hoursSpec[]` (whole arrays) | — |
| Booking | `booking`, `booker.brand`, `booker.giftCertificate`, `bookerSlug` | — |
| Services | `price`, `priceTo`, `photo` per existing `ServiceId` | which `ServiceId`s exist, `slug` |
| Social/Reviews | `socialProfiles[]`, `reviews{}`, `geo{}` | — |

## Admin UI

- Display-only header banner: **"Configuring store: {site.name} — {tenant.id}"**
  (answers "select store": fixed per container, not switchable).
- Sectioned form (tabs or accordions): Brand & SEO · Contact/NAP · Hours · Booking &
  Gift · Services (prices) · Social & Reviews. SEO fields are **per-locale (fr/en)**.
- Save → `PUT /api/admin/settings` → toast; success means edits are live after revalidate.
- OG image upload reuses the existing `/api/admin/upload` route + bucket pattern.
- Add a link to `/admin/settings` from the `/admin` home page.

## Safety & fallback (parity with popups)
- DB not configured / error / empty → **static defaults** (site never breaks).
- Invalid DB doc → `safeParse` drops it, logs, falls back to defaults.
- Save path surfaces zod validation errors loudly in the form.

## Supabase migration
- Table `store_settings`: `tenant_id text primary key`, `doc jsonb not null`,
  `updated_at timestamptz` (ISO 8601, e.g. `2026-06-05T13:40:00.000Z`). RLS mirroring the
  `popups` table: anon `SELECT`, writes only via service-role key. (Public read needs
  anon SELECT for `getStoreConfig` on public pages.)
- Synthetic example `doc`:
  `{ "site": { "name": "Ongles Demo", "reviews": { "ratingValue": 4.9 } },
     "services": [{ "id": "pose-ongles", "price": 65, "priceTo": 80 }] }`

## Verification
- **Unit:** schema accept/reject; `getStoreConfig()` merge precedence; null/empty/invalid
  DB → defaults.
- **Integration:** `PUT` settings → `GET` reflects; public page `generateMetadata` picks
  up the new DB SEO title.
- **E2E (Playwright):** login → `/admin/settings` → change meta title + a service price →
  save → reload public home: new `<title>` and new price render **without a rebuild**.
- **Manual:** `TENANT=ongles-maily npm run dev`, edit, confirm live.

## Complexity
**Medium–large** (broad consumer migration + large form). Suited to a worktree +
subagent-driven implementation. Next step: `/s1-plan` to enumerate exact consumers and
sequence the migration.
