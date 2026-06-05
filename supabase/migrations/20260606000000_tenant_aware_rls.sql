-- Tenant-aware RLS: physically scope anon reads to the requesting tenant so the
-- shared Supabase project cannot leak one branded site's rows to another via the
-- (public, bundle-shipped) client credential.
--
-- ┌─ HARD DEPENDENCY — DO NOT APPLY UNTIL THE APP IS WIRED ─────────────────────┐
-- │ Today every container reads with the plain anon key, which carries NO        │
-- │ tenant_id claim. After this migration `auth.jwt() ->> 'tenant_id'` is NULL   │
-- │ for those requests, every `using (...)` predicate is NULL → false, and ALL   │
-- │ public reads return zero rows. You MUST first switch each container to a     │
-- │ per-tenant JWT (see "App wiring" below) or every site goes blank.            │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- Mechanism: instead of the shared anon key, each container is built with a
-- long-lived JWT signed by the project JWT secret, carrying:
--     { "role": "anon", "tenant_id": "<this container's tenant>" }
-- The JWT is public (it ships in the browser bundle) but only unlocks ITS OWN
-- tenant's rows, so leaking it is no worse than visiting that site. A client
-- cannot mint a JWT for a different tenant without the server-side JWT secret.
--
-- Service-role writes are unaffected: the service-role key bypasses RLS entirely,
-- so the admin API (popups-store, store-settings-store) keeps working as-is.

-- Helper: the tenant_id claim of the current request, or NULL when the caller
-- used a plain anon/service token with no such claim. STABLE + SQL so the planner
-- can inline it; SECURITY INVOKER (default) is correct — it only reads the JWT.
create or replace function public.request_tenant_id()
returns text
language sql
stable
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
    ''
  );
$$;

-- popups -------------------------------------------------------------------
drop policy if exists "popups_public_read" on public.popups;
create policy "popups_tenant_read"
  on public.popups for select
  to anon, authenticated
  using (tenant_id = public.request_tenant_id());

-- store_settings -----------------------------------------------------------
drop policy if exists "store_settings_public_read" on public.store_settings;
create policy "store_settings_tenant_read"
  on public.store_settings for select
  to anon, authenticated
  using (tenant_id = public.request_tenant_id());

-- newsletter_subscribers: unchanged. It has no anon policy (server-only via
-- service-role), so it is already isolated. Listed here only to document that
-- the omission is deliberate.

-- popup-images storage bucket: left world-readable (bucket_id-scoped policy from
-- the popups migration). Images are not tenant-partitioned by path today; if you
-- start namespacing object keys by tenant, scope that policy too.
