# Plan — Locations section: all "Book Now" buttons → internal `/book-online`

## Problem

In the "Our Salons" carousel, sister-salon cards link **Book Now** to external
`/reservation/` sites:

- Ongles Charlesbourg → `https://www.onglescharlesbourg.com/reservation/`
- Ongles Rivières → `https://www.onglesrivieres.com/reservation/`
- Ongles et Spa Québec → `https://www.onglesspaquebec.com/reservation/`

Only the tenant's own card already routes internally via `site.booking`
(`/book-online`).

## Decision

Route every card's Book Now through `/${lang}${site.booking}` — the same path
every other Book CTA in the app already uses (`Header`, homepage, pricing,
about, services, `FloatingCTA`, …). There is no `/book-now` route; the site's
booking page is `src/app/[lang]/book-online/` (all tenants set
`booking: "/book-online"`). We redirect to that existing page.

## Changes — one file

`src/components/SalonCard.tsx`, in `buildSalonCards`:

- Sisters map: `bookHref: s.booking` → `bookHref: \`/${lang}${site.booking}\``.
- Sisters keep `external: true` — it only controls `target="_blank"` on the
  name/website link; `Button` does not consume it for `bookHref`, so Book Now
  opens in the same tab. Verify `Button`/`a` props unchanged.
- Update the stale comment at ~line 188–190:
  `// SalonX widget). Sister cards below keep their external reservation URLs.`
  → sisters now use the same internal booking path.

`src/lib/salons.ts` — optional cleanup:

- `SisterSalon.booking` becomes dead once SalonCard stops reading it. Check for
  other consumers (`grep s.booking` shows SalonCard is the only one) and delete
  the field + 4 data entries. If a consumer remains, leave it.
- `comingSoon` cards may still lack a booking URL — `bookHref` now comes from
  `site.booking`, so a coming-soon card would show a live Book Now button.
  Check current data: no `comingSoon` entry exists today; low risk.

## Verification

- `npx tsc --noEmit` (or project equivalent) — `s.booking` removal type-checks.
- `npm run dev`, open `/en` → "Our Salons" → click Book Now on each of the 4
  cards → all land on `/en/book-online`. Repeat on `/fr` → `/fr/book-online`.
- `pnpm test` / existing suites: `page.cta.test.ts` asserts
  `/${lang}${site.booking}` wiring — should stay green.

## Out of scope

- Name anchor still points to each sister salon's own website (unchanged).
- No changes to `site.booking` values, routing, or dictionaries.
