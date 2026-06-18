# Lessons

## Self-hosted Supabase storage 401 (popup-images logo bug)

- **A 401 on `/storage/v1/object/public/...` is a Kong gateway problem, not the
  `bucket.public` flag.** The pasted runbook blamed `bucket.public=false` (from the
  `on conflict do nothing` seed). Wrong — the bucket was already `public=t` and the
  object existed. The 401 came from Kong: `www-authenticate: Key realm="kong"`,
  `{"message":"No API key found in request"}`, `x-kong-response-latency: 0`
  (rejected before storage-api). This stack's `kong.yml` `storage-v1` service had
  `key-auth`+`acl` on the only route, so browser `<img src>` requests (which carry
  NO `apikey` header) were blocked. Default upstream Supabase puts only `cors` on
  storage so public URLs work. Fix: add a `storage-v1-public` route for
  `/storage/v1/object/public/` with key-auth omitted (mirrors the existing
  `functions-v1-public`/`r2-storage-v1` precedent in the same file); use
  `url: http://storage:5000/object/public/` + `strip_path: true` so the upstream
  path rebuilds correctly. Diagnostic rule: `curl -i` the public object and read
  the response `server:`/`www-authenticate:` headers BEFORE touching the DB.
  (kong gateway, /root/supabase-setup/ongles-shared/volumes/kong/kong.yml)
- **Single-FILE docker bind mount + editor atomic-rename = stale container.**
  Editing the host `kong.yml` (Edit/Write replaces the inode via temp+rename) does
  NOT reach a container that bind-mounts that single file — the mount tracks the
  original inode. `kong reload` re-read the OLD content; `grep -c` inside the
  container showed 0 matches while the host had the edit. Fix: `docker restart` the
  container (re-resolves the bind to the current host path). Rule: after editing a
  bind-mounted single file, verify with `docker exec <c> grep` before reload; if
  stale, restart rather than reload. (kong gateway)
- **`api-supabase-ongles.onglesmaily.com` (the `supabase-ongles` stack /
  `supabase-ongles-db`) backs all three ongles tenant sites: charlesbourg,
  rivieres, maily.** Map a site to its stack via the website container's
  `NEXT_PUBLIC_SUPABASE_URL`, not by guessing from the name. The `ongles` Kong is
  shared — gateway edits affect all three. (multi-tenant)

## Verification
- **Grep the rendered FIELD, not lookalike copy.** Debugging admin-store-settings, I concluded "live price edit broken" because `grep "From $60"` still matched after editing to $199. Reality: `From $60.` is **static marketing copy** inside `dict.serviceDetails[id].metaDescription` (and JSON-LD), while the live price renders as lowercase `from $199` in a specific `<span>`. Case + lookalike text produced a false negative that triggered an unnecessary `force-dynamic` refactor (later reverted). Rule: when a value "won't update," log/inspect the exact rendered field before concluding failure. (admin-store-settings, 2026-06-05)
- **ISR + revalidateTag is stale-while-revalidate.** First request after a tag purge serves STALE and regenerates in the background; the fresh value appears on the **2nd** request. Poll ≥2 times before declaring it broken. (admin-store-settings)

## Next.js (this repo)
- **`next start` is incompatible with `output: "standalone"`** (set in next.config.ts for Docker). It serves a broken/stale app and prints a warning that's easy to miss. Test production locally with `node .next/standalone/server.js` after `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public` and exporting env (`set -a; . ./.env.local; set +a`). (admin-store-settings)
- **Worktree builds need their own `node_modules`.** `turbopack.root` is pinned to the project dir, so Turbopack won't resolve `next` up-tree the way `bun` does; a relative `node_modules` symlink is rejected ("points out of filesystem root"). Run `bun install` inside the worktree (gitignored). (admin-store-settings)
- **`bun test` collides with Playwright** (both define global `test()`). Scope unit tests to `bun test src/`; keep Playwright on `test:e2e`. (admin-store-settings)

## Adding a tenant
- **Registering a tenant takes THREE files, not one.** `src/config/index.ts` is the obvious registry, but `src/app/[lang]/dictionaries.ts` and `src/app/[lang]/seo-content.ts` each hold their own hardcoded tenant→JSON import maps. The base dict has no page-level keys (`about`, `faq`, …) — they come entirely from the tenant content layer — so a tenant missing from those maps build-fails at render with `Cannot read properties of undefined (reading 'heading')`. New tenant ⇒ add to all three. (template-baseline-and-custom-code, 2026-06-06)

## Multi-tenant RLS rollout (pending — commit c6606dc)

One Supabase project serves all 3 branded containers; rows are partitioned by
`tenant_id`. Tenant-aware RLS (`supabase/migrations/20260606000000_tenant_aware_rls.sql`)
is drafted but **NOT applied** — it is a coordinated deploy. Apply out of order
and every public read returns zero rows (policy fails closed: NULL claim → false).

Rollout order (must be exact):
1. `SUPABASE_JWT_SECRET="<dashboard → Settings → API → JWT Secret>" node scripts/gen-tenant-jwts.mjs`
   → prints one `NEXT_PUBLIC_SUPABASE_TENANT_JWT` per tenant.
2. Set each container's `NEXT_PUBLIC_SUPABASE_TENANT_JWT` (Dokploy env) to its own JWT.
3. **Rebuild all 3 containers** (the JWT is baked at build time, `NEXT_PUBLIC_*`).
4. Verify: `curl` Supabase REST with each JWT → confirm cross-tenant query returns `[]`.
5. **Only then** apply migration to prod (`supabase db push` or Dokploy migration step).

Why it is safe to sit un-applied: `supabase.ts` uses `tenantJwt ?? anonKey`, and the
migration is not run — current deploys behave exactly as before until step 5.

Notes:
- JWTs are public (ship in the bundle) but each unlocks only its own tenant — leaking
  one is no worse than visiting that site. Cannot be forged without the JWT secret.
- `newsletter_subscribers` (PII) is already isolated: no anon policy, server-only via
  service-role. Left unchanged.
- Rotate JWTs only when the project JWT secret rotates (TTL is 10y).

## SEO layer (commit 9242623)

- **Moving a persisted settings namespace silently orphans existing DB overrides.**
  The SEO refactor moved operator SEO from the `content` namespace to a new `seo`
  namespace; the new resolver stopped reading `content.*`, so any legacy DB SEO
  override went silently inert — it fell back to static JSON with no error. Fix:
  a read-time shim (`src/app/[lang]/legacy-seo-shim.ts`) folds the old location
  forward and `console.warn`s `[seo-shim]` when it fires so the tenant can be
  migrated and the shim deleted. Rule: when relocating a persisted namespace,
  ship a forward-fold shim — never assume the store is empty. (seo-layer-followups)
- **`type SeoDictionary = typeof en` gives no compile-time locale-parity guard.**
  Keys missing from `fr.json` become runtime `undefined`, not type errors —
  identical caveat to the UI `Dictionary` type (see AGENTS.md). Parity is enforced
  only by `src/config/seo/seo-parity.test.ts`; keep it green when adding keys.
  (seo-layer-followups)

## Deploy / Traefik (VPS, Dokploy)

- **Dokploy registers only the `www.` host per tenant — the bare apex has no Traefik
  router, so apex TLS handshakes fail.** Dokploy owns `*-<hash>.yml` in
  `/etc/dokploy/traefik/dynamic/` and regenerates them on every redeploy, so apex
  routers hand-added there get clobbered. Fix lives in a **separate, non-Dokploy
  file** (`infra/traefik/ongles-apex-redirect.yml`, scp'd to the VPS): per-tenant
  web+websecure apex routers, a `redirectRegex` apex→www middleware (`permanent:true`
  → **301**, not 308), websecure cert via the global `certResolver`, and a dummy
  unreachable service the redirect short-circuits before dialing. ACME HTTP-01
  outranks the redirect on `/.well-known/acme-challenge/*`, so apex certs still issue.
  (apex-www-redirects, 2026-06-12)
- **Traefik ACME backoff is in-memory and not reset by `touch`ing a dynamic file.**
  rivieres' early challenges 404'd because DNS hadn't propagated past Wix yet; Traefik
  then sat in backoff and never retried even after DNS was clean. A no-op `touch`
  (mtime-only, identical content) does **not** dislodge it — the file provider dedups
  unchanged config. Only a `docker restart dokploy-traefik` clears the backoff (certs
  persist on-disk in `acme.json`, so all sites return valid immediately; ~2-5s blip).
  Check `dig`, port-80 reachability, and a working sibling's `/.well-known/...` (it 404s
  too — that's normal "no active token") before blaming routing. (rivieres-cert, 2026-06-12)

## Routing / locale proxy (src/proxy.ts)

- **New standalone root-level routes (kiosk/widget pages outside `[lang]`) MUST be
  added to `STANDALONE_PATHS` in `src/proxy.ts` or they 404.** The locale proxy
  (Next.js 16 renamed middleware) redirects any path not in that allowlist to
  `/{locale}{path}`. Since these pages live at the app root, not under `[lang]/`,
  the redirected `/fr/clientportal` has no matching route → 404. `/clientportal`
  (PR #9) and `/subscription` (PR #10) both shipped broken because the page files
  were added without touching the allowlist. Checklist: any time you add
  `src/app/<name>/page.tsx` as a standalone page, add `"/<name>"` to
  `STANDALONE_PATHS`. (standalone-route-allowlist, 2026-06-13)

## Build-guard / integration truths must be proven by running the command, not asserted
A gsd-executor (Plan 01-1) reported the `next.config.ts` build guard verified ("next build
would succeed") but never ran a real `next build`. Ground truth: every build failed
(MODULE_NOT_FOUND) — a dynamic `await import()` of a `.ts` module bypasses Next 16's
SWC require-hook; only a static import (→ `require(`) registers the hook. The broken guard
shipped to `main` and would have failed the Dokploy deploy.
Rule: any truth of the form "build aborts/passes" or "integration works" must be backed by
actual command output (success path AND forced-failure path), captured in the SUMMARY. Treat
an executor's unproven "verified" claim as unverified — re-run it. (fix: bbc5718)
