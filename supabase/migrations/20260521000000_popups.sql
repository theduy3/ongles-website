-- Popups: each row stores a full popup object as JSONB. The app validates the
-- shape with PopupSchema (src/lib/popup.ts), so the table stays schema-agnostic.

create table if not exists public.popups (
  id text primary key,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.popups enable row level security;

-- Public read only. Writes are performed server-side with the service-role key,
-- which bypasses RLS, so no insert/update/delete policies are defined here.
drop policy if exists "popups_public_read" on public.popups;
create policy "popups_public_read"
  on public.popups for select
  to anon, authenticated
  using (true);

-- Public bucket for popup images.
insert into storage.buckets (id, name, public)
values ('popup-images', 'popup-images', true)
on conflict (id) do nothing;

drop policy if exists "popup_images_public_read" on storage.objects;
create policy "popup_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'popup-images');

-- Seed the two currently-live popups so launch behavior matches popups.json.
insert into public.popups (id, doc) values
  (
    'promo-active',
    '{
      "id": "promo-active",
      "version": 1,
      "type": "rich",
      "priority": 10,
      "startsAt": null,
      "endsAt": "2026-05-31T23:59:59Z",
      "frequency": "session",
      "image": null,
      "title": { "en": "Spring Special", "fr": "Spécial printemps" },
      "body": { "en": "15% off your next visit.", "fr": "15 % de rabais sur votre prochaine visite." },
      "cta": { "label": { "en": "Book now", "fr": "Réserver" }, "href": "/appointments" }
    }'::jsonb
  ),
  (
    'subscribe-ss',
    '{
      "id": "subscribe-ss",
      "version": 1,
      "type": "embed",
      "priority": 10,
      "startsAt": "2026-06-01T00:00:00Z",
      "endsAt": null,
      "frequency": "session",
      "html": "<script src=\"https://app.onglessanssouci.com/widgets/subscribe-widget.js\" data-subscribe-store=\"SS\"></script>"
    }'::jsonb
  )
on conflict (id) do nothing;
