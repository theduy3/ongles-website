-- Store settings: one row per tenant holding a SPARSE value-only override of the
-- static store config (src/config/tenants/<id>/). The app deep-merges `doc` over
-- the build-time defaults at request time (src/lib/store-config.ts), so the owner
-- can edit NAP, hours, prices, SEO meta, social/reviews from /admin/settings and
-- have them go live WITHOUT a rebuild. Shape is validated by StoreSettingsSchema
-- (src/lib/store-settings-schema.ts), so the table stays schema-agnostic.
--
-- `tenant_id` is the primary key: exactly one override document per branded store.
-- No seed rows — absence of a row means "use static defaults" (the fallback path).

create table if not exists public.store_settings (
  tenant_id  text primary key,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

-- Public read only (the public anon client reads the override for SSR/SEO via
-- readStoreSettings). Writes happen server-side with the service-role key, which
-- bypasses RLS, so no insert/update/delete policies are defined here — identical
-- to the popups table. The application scopes every read/write to the active
-- tenant via `.eq('tenant_id', ...)` (src/lib/store-settings-store.ts). Tighten
-- with a tenant-aware policy later if anon clients should be physically prevented
-- from cross-tenant reads.
drop policy if exists "store_settings_public_read" on public.store_settings;
create policy "store_settings_public_read"
  on public.store_settings for select
  to anon, authenticated
  using (true);
