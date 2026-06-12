# Spec: Runtime Tenancy (build-once, configure-per-container)

**Date:** 2026-06-12
**Status:** draft
**Repo:** ongles-website

## Problem

ongles-website is a multi-tenant marketing site: one repo serves N salon tenants
(`ongles-maily`, `ongles-charlesbourg`, `ongles-rivieres`), each on its own domain.
Tenant identity is selected by `process.env.TENANT` in `src/config/index.ts`, which
picks one entry from a registry that already imports **all** tenants' content.

Today that selection is **build-time** and the deploy pipeline doesn't deliver it:

1. Pages are statically pre-rendered (`generateStaticParams` + default static), so
   tenant content is baked into HTML at `npm run build` using the build-time `TENANT`.
2. The active deploy path is **Dokploy building the Dockerfile on the VPS**, and Dokploy
   is **not** forwarding the apps' configured `buildArgs` to `docker build`
   (`grep TENANT <build-log>` = 0 hits). So every tenant builds with the Dockerfile
   default `ARG TENANT=ongles-maily`, and Docker layer cache reuses one maily
   `RUN npm run build` layer for all three.
3. `.github/workflows/deploy.yml` only *builds* throwaway images (`push: false`, deploy
   step is a TODO) — it never updates the running containers.

**Net effect:** all three domains serve `ongles-maily` (Carrefour Beauport) content.
Because the Supabase anon/tenant-JWT vars are `NEXT_PUBLIC_*` (also build-inlined, also
in the dropped buildArgs), all three also ship maily's Supabase JWT.

## Goal

One **tenant-agnostic image**. Each container differs only by **runtime environment**
(`TENANT` + Supabase vars), which Dokploy injects reliably (proven: `ADMIN_PASSWORD`,
`SUPABASE_SERVICE_ROLE_KEY` already arrive at runtime). No build-args, no per-tenant
build, no Docker-cache trap.

Success criteria:
- The **same** built image, run with `TENANT=ongles-charlesbourg`, renders Charlesbourg
  content/SEO; with `TENANT=ongles-rivieres`, renders Rivières. Verifiable by swapping
  only the env var.
- Each live domain serves its own content, SEO metadata, and Supabase JWT.
- Existing e2e (per-page custom code injection) stays green.

## Non-goals

- Hostname-based single-container multi-tenancy (Approach C) — a future evolution, out
  of scope here.
- Applying the pending tenant-aware RLS migration (`20260606000000_tenant_aware_rls.sql`).
  This work *unblocks* it (correct per-tenant JWT at runtime) but does not apply it.
- Fixing `deploy.yml` to auto-push/deploy — tracked separately; Dokploy remains the
  deploy mechanism.

## Current-state facts (verified)

- `src/config/index.ts`: `const requested = process.env.TENANT ?? "ongles-maily"`,
  resolved at module load; registry statically imports all tenants + `template`.
- Client components importing `@/config` (build-inlined tenant): **exactly two** —
  `src/components/Header.tsx`, `src/components/admin/settings/SeoSection.tsx`.
- Supabase is **server-only**: `@/lib/supabase` imported only by
  `src/app/api/newsletter/route.ts`, `src/lib/popups-store.ts`,
  `src/lib/store-settings-store.ts`. No browser usage.
- `NEXT_PUBLIC_*` consumers in `src/`: only the 3 Supabase vars (in `supabase.ts`).
  `NEXT_PUBLIC_SITE_URL` has **no `src/` consumer** (verify `next.config`/sitemap).
- `generateMetadata` present in ~10 `src/app/[lang]/**` page files → SEO resolves tenant,
  must run at runtime.
- `next.config.ts`: `output: "standalone"`.

## Design

### 1. Runtime tenant resolution
- Keep `@/config` resolving `process.env.TENANT` at module load — in the standalone
  server this runs at **boot**, so it reflects the container's runtime env (one tenant
  per container lifetime).
- Force runtime rendering on tenant-content routes: add `export const dynamic =
  "force-dynamic"` to the `[lang]` layout (covers nested pages + `generateMetadata`).
  This prevents build-time pre-render from pinning the tenant.
- Keep `generateStaticParams` for `[lang]` **locale** params (en/fr) only — locale is not
  tenant-varying. Confirm `force-dynamic` + `generateStaticParams` coexist as intended
  (dynamic wins for rendering; params list still valid for routing). If they conflict,
  drop `generateStaticParams` and rely on `dynamicParams`.

### 2. Client propagation — ALREADY HANDLED (verify only)
Re-checked during planning: client components do **not** import the runtime tenant value.
- `getStoreConfig()` (`src/lib/store-config.ts`, server) is the single tenant resolver; it
  reads `tenant`/`site` from `@/config`, merges DB overrides, and the layout passes the
  result down as a **prop**: `<Header dict={dict} locale={lang} site={site} />`.
- `Header.tsx` (`"use client"`) imports only the **type** `TenantSite` from
  `@/config/types` and consumes `site` via prop — no build-inlined tenant value.
- `SeoSection.tsx` imports a static `@/config/seo/seo.en.json` (admin default seed), not
  the tenant resolver.
- **No `TenantProvider` needed.** Prop-drilling from the server resolver already isolates
  the client from build-time tenant. Task: re-grep all `"use client"` files for any direct
  `@/config` / `@/lib/site` / `@/lib/locations` **value** import (current: none) and add a
  unit/lint guard so a future one is caught.

### 3. Env rename (server-only runtime)
- `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_TENANT_JWT` → `SUPABASE_TENANT_JWT`
- Update `src/lib/supabase.ts` to read the new names.
- Update `env.example`.
- `NEXT_PUBLIC_SITE_URL`: if only `next.config`/sitemap uses it, rename → `SITE_URL`
  (runtime) or keep as-is if a static sitemap genuinely needs build-time. Decide during
  impl from the actual consumer.

### 4. Dockerfile
- Remove `ARG TENANT` reliance and the `NEXT_PUBLIC_*` build-args from the build stage.
  Build produces the universal image (all tenants bundled, none selected).
- Runtime stage unchanged (`node server.js`).

### 5. Dokploy
- Keep the 3 apps. For each: move `TENANT` + `SUPABASE_*` from **buildArgs → Environment
  (runtime)**; clear buildArgs. All three build the identical image (layer-cache shared)
  and differ only by runtime env.
- Per-app runtime env:
  - maily: `TENANT=ongles-maily`, `SUPABASE_*` = maily values
  - charlesbourg: `TENANT=ongles-charlesbourg`, tenant JWT for charlesbourg
  - rivieres: `TENANT=ongles-rivieres`, tenant JWT for rivieres
- (Existing runtime secrets `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` stay in Environment, untouched.)

### 6. Testing
- Unit (`src/config`): set `process.env.TENANT` then dynamic-import config; assert
  correct tenant; assert default `ongles-maily` when unset; assert unknown id throws.
  Use module-cache reset between cases.
- Unit (`TenantProvider`/`useTenant`): provider seeds values; hook returns them; throws/
  defaults sensibly outside provider.
- Build-once verification (e2e or scripted): build one image; run with
  `TENANT=ongles-charlesbourg` → assert Charlesbourg hero subtitle; rerun container with
  `TENANT=ongles-rivieres` → assert Rivières. Same image digest both runs.
- Regression: existing custom-code e2e passes.

### 7. Rollout
1. Merge universal-image change to `main`.
2. In Dokploy, per app: move `TENANT`+`SUPABASE_*` to Environment, clear buildArgs.
3. Redeploy all 3 apps.
4. Verify each domain: own hero/SEO + correct tenant JWT in server requests.
5. Re-screenshot all three.

## Risks / mitigations
- **force-dynamic loses static perf** — fine for low-traffic marketing site; add cache
  headers / revisit ISR later if needed.
- **`generateMetadata` must be runtime** — covered by `force-dynamic` on `[lang]` layout;
  verify SEO output per tenant.
- **Missed transitive client consumer of `@/config`** — would render maily brand in that
  component. Mitigate: grep all `"use client"` importers before/after; build-once e2e
  catches divergence.
- **`force-dynamic` vs `generateStaticParams` interaction** — validate locally; fall back
  to `dynamicParams` if needed.
- **SITE_URL / sitemap** — if a static sitemap depends on build-time URL, keep that one
  build-time or generate sitemap at runtime. Decide from actual consumer.

## Out-of-band findings (not part of this spec — flag to owner)
- GitHub PAT printed in cleartext in Dokploy build logs (`/etc/dokploy/logs/...`,
  clone URL) — recommend rotating that deploy token.
- `.github/workflows/deploy.yml` deploys nothing (build-only) — separately wire or remove
  to avoid false "deploy success" signals.
