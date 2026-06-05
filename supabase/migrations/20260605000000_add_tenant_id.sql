-- Multi-tenant isolation: stamp popups and newsletter subscribers with the owning
-- tenant so the shared Supabase project keeps each branded site's data separate.
-- Existing rows belong to the original site, so they backfill to 'ongles-maily'.

-- popups -------------------------------------------------------------------
alter table public.popups
  add column if not exists tenant_id text not null default 'ongles-maily';

create index if not exists popups_tenant_id_idx
  on public.popups (tenant_id);

-- newsletter_subscribers ---------------------------------------------------
alter table public.newsletter_subscribers
  add column if not exists tenant_id text not null default 'ongles-maily';

-- The same email may now subscribe to more than one tenant, so uniqueness is the
-- (email, tenant_id) pair rather than email alone. Drop the old single-column
-- constraint if it exists, then add the composite one the upsert onConflict uses.
alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_email_key;

create unique index if not exists newsletter_subscribers_email_tenant_key
  on public.newsletter_subscribers (email, tenant_id);

-- NOTE: RLS policies are unchanged. The anon public client still has SELECT on
-- popups; the application scopes every read/write to the active tenant via
-- `.eq('tenant_id', ...)` (see src/lib/popups-store.ts). Tighten with a tenant-aware
-- RLS policy later if anon clients should be physically prevented from cross-tenant reads.
