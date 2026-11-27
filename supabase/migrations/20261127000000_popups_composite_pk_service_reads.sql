-- Popups composite primary key + end of anon reads.
--
-- Two defects surfaced on 2026-11-27 when the same Black Friday campaign popup
-- was published to three tenants:
--
-- 1. popups.id was a GLOBAL primary key, but every tenant shares one Supabase
--    project. Publishing the same campaign id to a second tenant overwrote the
--    first tenant's row — the upsert conflict target was id alone. The key is
--    now (id, tenant_id), matching the composite uniqueness newsletter_subscribers
--    already uses for (email, tenant_id).
--
-- 2. The tenant-aware RLS migration (20260606000000) was applied without wiring
--    SUPABASE_TENANT_JWT into the containers, so every anon read returned zero
--    rows — no popup could render on any site. The public read paths
--    (readPopups, readStoreSettings) now use the service-role client: they run
--    server-side only, already scope every query with .eq("tenant_id", …), and
--    the admin write paths prove the service key is present wherever these run.
--    Anon therefore needs no SELECT policy at all — default deny. The policies
--    dropped below are not replaced.
--
--    If browser-direct Supabase reads are ever introduced, re-add tenant-scoped
--    policies THEN (with the per-tenant JWT wiring 20260606000000 describes) —
--    not before. Both tables hold only public marketing content today, so the
--    practical exposure of this change is nil; the win is that the system no
--    longer depends on a JWT claim that production never supplied.

-- popups composite key -------------------------------------------------------
-- Existing rows keep their (unique) ids, so the rebuild cannot collide.
alter table public.popups drop constraint if exists popups_pkey;
alter table public.popups add primary key (id, tenant_id);

-- anon reads end -------------------------------------------------------------
drop policy if exists "popups_public_read" on public.popups;
drop policy if exists "popups_tenant_read" on public.popups;
drop policy if exists "store_settings_public_read" on public.store_settings;
drop policy if exists "store_settings_tenant_read" on public.store_settings;
