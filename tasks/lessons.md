# Lessons

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
