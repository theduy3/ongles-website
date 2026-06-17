# External Integrations

**Analysis Date:** 2026-06-17

## APIs & External Services

**Email Delivery:**
- Resend (https://resend.com)
  - What it's used for: Contact form submission delivery
  - SDK/Client: REST API via fetch (`src/lib/email.ts`)
  - Auth: `RESEND_API_KEY` env var
  - Fallback: In development, accepts submissions without sending; in production, fails loudly if unconfigured

**Google Business Profile API:**
- Google OAuth2 + Business Profile API (https://mybusiness.googleapis.com/v4/)
  - What it's used for: Fetch real 5-star reviews for SEO JSON-LD AggregateRating
  - Build-time only: Script `scripts/fetch-google-reviews.mjs` runs manually to fetch reviews into `src/data/google-reviews.json`
  - Auth: OAuth2 refresh token flow
  - Credentials: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`
  - Account IDs: `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID` (numeric from My Business resource names)
  - Never called at runtime; only at build time or manual script execution

**SalonX Widget APIs:**
- SalonX (https://app.onglesmaily.com)
  - What it's used for: Third-party widgets for check-in, queue, client portal, and subscription management
  - Widgets injected via script tags:
    - Check-in widget: `https://app.onglesmaily.com/widgets/checkin-widget.js` (reads `data-store` attribute)
    - Queue widget: Embedded on `src/app/queue/page.tsx` (not yet in codebase; similar pattern to check-in)
    - Client portal widget: `https://app.onglesmaily.com/widgets/client-account-widget.js` (reads `data-account-store` attribute)
    - Subscribe widget: `https://app.onglesmaily.com/widgets/subscribe-widget.js` (reads `data-subscribe-store` attribute)
  - Implementation: Dynamic script injection in `src/components/WidgetEmbed.tsx` with loading/error states
  - Store ID: Per-tenant (e.g., "OM" for Ongles Maily)
  - Widget host: Configurable per tenant via `site.widgetHost` in tenant config (`src/config/tenants/*/site.ts`)

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: `SUPABASE_URL` (server endpoint)
  - Auth clients: `@supabase/supabase-js` 2.106.1
  - Two modes: public (anon key with RLS, readonly) and admin (service-role key, full access)
  - Per-tenant JWT: `SUPABASE_TENANT_JWT` (optional, scopes anon reads to tenant via `tenant_id` claim in RLS)

**Tables:**
- `popups` - Pop-up campaign management
  - Accessed via: `src/lib/popups-store.ts` (admin writes), public reads via RLS
- `newsletter_subscribers` - Newsletter email subscriptions
  - Columns: `email`, `source`, `tenant_id`
  - Accessed via: `src/app/api/newsletter/route.ts` (upsert on submit)
- `store_settings` - Per-tenant store configuration and customization
  - Schema defined: `src/lib/store-settings-schema.ts`
  - Accessed via: `src/lib/store-settings-store.ts` (admin reads/writes)

**File Storage:**
- Supabase Storage bucket: `popup-images`
  - Used for: Pop-up campaign image uploads by admin
  - Accessed via: `src/app/api/admin/upload/route.ts`

**Caching:**
- None - app relies on Supabase caching and CDN edge locations for images

## Authentication & Identity

**Auth Provider:**
- Custom (iron-session)
  - Implementation: Password-based login for admin portal (`/admin`)
  - Session storage: Encrypted cookie (iron-session, no external session store)
  - Session secret: `ADMIN_SESSION_SECRET` (32+ characters)
  - Password: `ADMIN_PASSWORD` (hardcoded per environment, not user-managed)
  - Login route: `src/app/api/admin/login/route.ts`

**Row-Level Security (Supabase RLS):**
- Public popups table: RLS policies restrict anon reads to tenant matching JWT `tenant_id` claim
- Admin routes: Guarded by iron-session cookie check before Supabase admin client calls
- Migration: `supabase/migrations/20260606000000_tenant_aware_rls.sql` enforces tenant isolation

## Monitoring & Observability

**Error Tracking:**
- None detected - errors logged to stderr via `console.error` and `console.warn`

**Logs:**
- Server-side: Console output (stderr/stdout) captured by deployment platform (Dokploy)
- Client-side: None (no error tracking SDK)

## CI/CD & Deployment

**Hosting:**
- Dokploy VPS (self-hosted deployment platform)
  - Auto-deploy trigger: Webhook on push to `main` branch
  - Deployment flow: VCS → Dokploy → Docker build (multi-stage) → Container registry → Deploy
  - No GitHub Actions CI/CD observed (deployment is fully webhook-driven)

**Deployment Architecture:**
- Single Docker image serves all three tenants
- Build-time: Tenant-agnostic (all tenant code bundled)
- Runtime: `TENANT` env var selects active tenant at container startup
- No rebuild required per domain; one image deployed to three domains with different env configs

**Build Process:**
- `bun install --frozen-lockfile` (deps stage, Bun)
- `npm run build` (build stage, Node)
- `next build` (Next.js standalone output)
- `node server.js` (runner stage, serves `.next/standalone`)

## Environment Configuration

**Required env vars (RUNTIME):**
- `TENANT` - Tenant selection: `ongles-maily` | `ongles-charlesbourg` | `ongles-rivieres`
- `SUPABASE_URL` - Supabase project endpoint
- `SUPABASE_ANON_KEY` - Anonymous key for public Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server-side writes (never in browser)
- `ADMIN_PASSWORD` - Password for `/admin` portal login
- `ADMIN_SESSION_SECRET` - 32+ character secret for iron-session encryption

**Optional env vars (RUNTIME):**
- `SUPABASE_TENANT_JWT` - Per-tenant JWT carrying `tenant_id` claim (scopes anon reads via RLS)
- `RESEND_API_KEY` - Resend API key for contact form (omit to disable form in production)
- `CONTACT_FROM_EMAIL` - Verified sender address on Resend domain
- `CONTACT_TO_EMAIL` - Recipient for contact form (defaults to `site.contact.email`)
- `POPUP_SOURCE_URL` - URL to fetch pop-up array (omit to use local `src/data/popups.json`)

**Build-time env vars (Docker `--build-arg`):**
- `TENANT` - Baked into image for single-tenant builds (not used in current multi-tenant approach)

**Script-only env vars (build-time fetch, not runtime):**
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` - Google OAuth2 credentials
- `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID` - Google Business Profile numeric IDs

**Secrets location:**
- Runtime: Docker env vars passed at container start (Dokploy deployment)
- Development: `.env.local` file (gitignored)
- CI/Deployment: Dokploy secrets management or GitHub Secrets (if GitHub Actions were used)
- Template: `env.example` (checked in, safe defaults and documentation)

## Webhooks & Callbacks

**Incoming:**
- Dokploy webhook - Triggered on `main` branch push; initiates auto-deploy
  - Endpoint: Not exposed in codebase (managed by Dokploy)

**Outgoing:**
- Supabase RLS policies - Async triggers on newsletter subscription (none observed in migrations)
- None detected

## Widget Configuration Per Tenant

**Tenant-specific settings** in `src/config/tenants/*/site.ts`:
- `widgetHost` - SalonX app URL (shared across all tenants, typically `https://app.onglesmaily.com`)
- Booking link (CTA redirect) - Points to per-tenant reservation system
- Gift certificate link (CTA redirect)
- Store ID for widgets (e.g., "OM", "CB", "OR")

**Widget Embedding Pattern:**
- Central component: `src/components/WidgetEmbed.tsx`
  - Handles imperative script injection (not React-managed)
  - Detects load/error status
  - Supports custom `storeAttr` for different widget types
  - Provides retry UI on failure
- Specific widgets:
  - `src/components/CheckinWidget.tsx` - Uses `data-store` attribute
  - `src/components/ClientPortalWidget.tsx` - Uses `data-account-store` attribute
  - `src/components/SubscriptionWidget.tsx` - Uses `data-subscribe-store` attribute

## API Endpoints (Internal)

**Contact Form:**
- `POST /api/contact` - Validates input (Zod schema), calls Resend, returns success/error
  - Handler: `src/app/api/contact/route.ts`
  - Graceful degradation: Returns 503 in production if Resend unconfigured; accepts silently in dev

**Newsletter:**
- `POST /api/newsletter` - Validates email, upserts into `newsletter_subscribers` table
  - Handler: `src/app/api/newsletter/route.ts`
  - Graceful degradation: Returns success in dev if Supabase unconfigured; fails explicitly in production

**Admin (Protected by iron-session):**
- `POST /api/admin/login` - Password check, sets session cookie
- `GET /api/admin/settings` - Fetch per-tenant store settings from Supabase
- `POST /api/admin/settings` - Update per-tenant store settings
- `GET /api/admin/popups` - List popups for admin UI
- `POST /api/admin/popups` - Create pop-up
- `PATCH /api/admin/popups/[id]` - Update pop-up
- `DELETE /api/admin/popups/[id]` - Delete pop-up
- `POST /api/admin/upload` - Multipart form upload to Supabase bucket

**Public (No Auth):**
- `GET /api/popups` - Return pop-up array for public display (falls back to local JSON if Supabase down)

---

*Integration audit: 2026-06-17*
