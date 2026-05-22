-- Newsletter subscribers: stores email addresses collected via the website
-- subscription form (POST /api/newsletter). Inserts are performed server-side
-- with the service-role key, which bypasses RLS, so no anon INSERT policy is
-- defined here — anonymous clients have read/write access denied by default.

create table if not exists public.newsletter_subscribers (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  created_at timestamptz not null default now(),
  source     text        not null default 'website'
);

alter table public.newsletter_subscribers enable row level security;

-- No anon read or write policies. All access goes through the service-role admin
-- client (see src/app/api/newsletter/route.ts), which bypasses RLS implicitly.
-- This comment mirrors the pattern used by the popups table above.
