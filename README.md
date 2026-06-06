# Pure Nail Bar — Website

Next.js 16 multilingual (EN/FR) booking & information site for **Pure Nail Bar**, luxury nail care in Vancouver, BC.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4
- **Data/Auth:** Supabase, iron-session
- **Animation:** framer-motion
- **Testing:** Playwright (E2E)
- **Booking:** Booker platform (go.booker.com/brand/purenailbar)

## Getting Started

```bash
cp env.example .env.local   # fill in values
bun install
bun run dev                 # http://localhost:3000
```

## Multi-tenant (one repo, N branded sites)

This codebase serves several branded salons from a single source tree. The active
tenant is chosen at **build time** via `process.env.TENANT`; each domain is its own
static build, so shared code/design changes propagate to all sites on rebuild while
each keeps its own brand, NAP, services, SEO copy and Schema.org data.

- **Tenants:** `ongles-maily` (default), `ongles-charlesbourg`, `ongles-rivieres`.
  (Quebec City is a coming-soon cross-promo card, not yet a buildable tenant.)
- **Config:** `src/config/` — `tenants/<id>/{site,location,services}.ts` +
  `content.<locale>.json` (per-tenant override); `base/content.<locale>.json` is the
  shared dictionary. `src/config/index.ts` resolves `TENANT` and exports `site`,
  `locations`, `services`, `tenant`. `src/lib/{site,locations,services}.ts` re-export
  these for backward compatibility.

```bash
# Build/preview a specific tenant locally:
TENANT=ongles-charlesbourg bun run build
# Per-tenant Docker image:
docker build --build-arg TENANT=ongles-charlesbourg -t maily-website:ongles-charlesbourg .
```

CI builds every tenant on push to `main` (`.github/workflows/deploy.yml`). Map each
image to its domain in your host (DNS A/CNAME per domain). Adding a tenant: create
`src/config/tenants/<id>/`, register it in `src/config/index.ts`, add it to the CI
matrix and the dictionary override map in `src/app/[lang]/dictionaries.ts`.

### New-site onboarding

A neutral `template` tenant ships as the canonical clone source:

```bash
cp -r src/config/tenants/template src/config/tenants/<new-id>
```

Edit the copied files — replace placeholder values (`"Your Salon"`, `"XX"`, geo `0,0`,
`example.com`, etc.) with the real brand, NAP, services, and SEO copy. Keep the key
structure of `content.en.json` / `content.fr.json` identical to `en.json` (keys missing
in any locale silently become `undefined` at runtime). Then register the new tenant in
`src/config/index.ts` and verify:

```bash
TENANT=<new-id> bun run build
```

## Admin — Custom code

The **Custom code** section in `/admin/settings` lets the store owner paste arbitrary
HTML/JS snippets (analytics tags, pixels, chat widgets, embeds) without a rebuild.

- **Placement:** choose `Head` (injected into `<head>`) or `End of body`.
- **Pages:** tick "All pages" (`*`) or select individual route keys (`home`, `services`,
  `book-online`, etc.).
- **Scope:** snippets run only on public `[lang]` pages. The `/admin`, `/checkin`, and
  `/queue` kiosk routes are outside that layout and never receive injected code.
- **Widget host:** the SalonX booking/check-in/queue widget origin is configurable in the
  **Brand** section — change it to re-point all three widgets without a rebuild.

> Note: this README's heading/intro still reflect an older template and are unrelated
> to the multi-tenant setup above.

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run start` | Serve production build |
| `bun run lint` | ESLint |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run fetch:reviews` | Pull Google Business reviews → `src/data/google-reviews.json` |

## Environment

Copy `env.example` to `.env.local` and fill in the required values (Resend contact-form delivery, Supabase for popups + newsletter, Google Business reviews, session secret).
