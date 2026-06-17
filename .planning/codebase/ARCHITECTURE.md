<!-- refreshed: 2026-06-17 -->
# Architecture

**Analysis Date:** 2026-06-17

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP Request / Browser                      │
│                              (middleware)                           │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ Middleware (src/proxy.ts)
         │ - Locale routing: prepend /[lang] prefix to all requests
         │ - Standalone paths bypass locale: /checkin, /clientportal, etc.
         │ - Admin auth gate: session cookie validation
         │
    ┌────▼──────────────────────────────────────────────────────────┐
    │              Next.js App Router Request Handling              │
    │  (force-dynamic rendering enabled for tenant resolution)      │
    ├────────────────────────────────────────────────────────────────┤
    │ Public Routes: [lang]/page.tsx, [lang]/[slug]/page.tsx, etc.  │
    │ Standalone: /checkin, /clientportal, /subscription, /queue    │
    │ Admin: /admin/*, /api/admin/*                                  │
    └────┬────────────────────────────────────────────────────────────┘
         │
         │ Runtime Tenant Resolution (src/config/index.ts)
         │ - Read process.env.TENANT at render time
         │ - Validate against TENANT_REGISTRY
         │ - Load static tenant config: site, location, services
         │
    ┌────▼──────────────────────────────────────────────────────────┐
    │              Config Merge Layer (src/lib/store-config.ts)     │
    │  - Static defaults (src/config/tenants/[tenant-id]/)          │
    │  - Supabase sparse overrides (site, location, services)       │
    │  - deepMerge algorithm: objects recurse, arrays replace       │
    │  - React cache (per-request dedup)                            │
    │  - unstable_cache (60s TTL, revalidatable tags)               │
    └────┬──────────────────────────────────────────────────────────┘
         │
         │ Resolved Configuration
         │ - TenantSite (brand metadata, logo, favicon, storeId)
         │ - Location (physical address, hours, geo)
         │ - Services (menu: price, description, photos)
         │ - CustomCode (injected <head> snippets, popups)
         │
    ┌────▼──────────────────────────────────────────────────────────┐
    │              Page & Component Rendering                        │
    │  - Server Component layouts pull config                       │
    │  - Client Components inject widgets imperatively              │
    │  - Locale dictionary loaded server-side                       │
    │  - SEO metadata generated per-locale                          │
    └────┬──────────────────────────────────────────────────────────┘
         │
         │ Widget Injection (WidgetEmbed, BookingWidget)
         │ - Imperative script injection in useEffect
         │ - storeId, widgetHost from config
         │ - data-lang attribute for booking widget localization
         │
    ┌────▼──────────────────────────────────────────────────────────┐
    │         Third-Party External Services                          │
    │  - SalonX Booking/Checkin/Queue Widgets (storeId configured)  │
    │  - Supabase (store settings overrides, auth)                  │
    │  - Email providers (contact/newsletter forms)                 │
    └────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Middleware | Route locale prefix & auth gate | `src/proxy.ts` |
| Tenant Resolver | Runtime env-var tenant selection | `src/config/index.ts` |
| Store Config Merger | Merge static + Supabase overrides | `src/lib/store-config.ts` |
| Layout (localized) | Page shell, Header, Footer, popups | `src/app/[lang]/layout.tsx` |
| Layout (standalone) | Minimal shell for kiosk/embedded widgets | `src/app/checkin/layout.tsx`, `src/app/clientportal/layout.tsx`, etc. |
| WidgetEmbed | Generic imperative widget loader | `src/components/WidgetEmbed.tsx` |
| BookingWidget | SalonX booking widget wrapper | `src/components/BookingWidget.tsx` |
| CheckinWidget | SalonX check-in kiosk | `src/components/CheckinWidget.tsx` |
| ClientPortalWidget | Client account portal widget | `src/components/ClientPortalWidget.tsx` |
| SubscriptionWidget | Subscription enrollment widget | `src/components/SubscriptionWidget.tsx` |

## Pattern Overview

**Overall:** Multi-tenant server-rendered SPA (Next.js App Router) with runtime tenant resolution and imperative third-party widget injection.

**Key Characteristics:**
- **One universal Docker image** serving multiple tenants — no build-time tenant pinning. `TENANT` env var selects active tenant per container.
- **Force-dynamic rendering** on all tenant-content routes (`[lang]` and standalone paths) to prevent static HTML baking build-time tenant data.
- **Sparse override model:** Static tenant configs stored in `src/config/tenants/`, Supabase provides sparse overrides (site.logo, site.favicon, service prices, etc.) that merge via `deepMerge()`.
- **Imperative widget injection:** Third-party widgets (SalonX kiosks, booking) are loaded imperatively in useEffect, not server-side script tags, giving per-request control over storeId & widgetHost.
- **Standalone routes without locale prefix:** `/checkin`, `/clientportal`, `/subscription`, `/queue` bypass the locale router (via `STANDALONE_PATHS` in proxy.ts) and resolve tenant independently.

## Layers

**Middleware (Request):**
- Purpose: Route locale prefix, admin auth gate, standalone path bypass
- Location: `src/proxy.ts`
- Contains: Locale matching (Accept-Language fallback), session validation, redirect logic
- Depends on: `src/lib/i18n` (locale detection), iron-session
- Used by: Every HTTP request (middleware scope)

**Configuration Layer:**
- Purpose: Resolve active tenant, merge static + Supabase overrides, provide cached config
- Location: `src/config/` (static defs), `src/lib/store-config.ts` (merge + cache)
- Contains: Tenant registry, static tenant files, deep-merge logic, React/Next.js cache
- Depends on: Supabase SDK, React cache, Next.js unstable_cache
- Used by: All server components (layouts, pages, API routes)

**Layout & Page Layer:**
- Purpose: Render page structure, load locale dictionary, generate SEO metadata
- Location: `src/app/[lang]/layout.tsx`, `src/app/[lang]/page.tsx`, standalone layouts
- Contains: Server-side data loading, metadata generation, component composition
- Depends on: `getStoreConfig()`, dictionary loader, SEO utilities
- Used by: Browser (renders HTML)

**Component Layer:**
- Purpose: UI composition — marketing blocks, forms, widget containers
- Location: `src/components/*.tsx`
- Contains: Server and Client Components, layout elements, widget wrappers
- Depends on: Next.js (Image, Link), third-party libs (React, Tailwind)
- Used by: Layout & page components

**Widget Injection Layer:**
- Purpose: Load third-party scripts imperatively, manage lifecycle
- Location: `src/components/WidgetEmbed.tsx`, `src/components/BookingWidget.tsx`, etc.
- Contains: useEffect-based script injection, error handling, retry logic
- Depends on: React hooks, DOM APIs
- Used by: Kiosk pages (/checkin, /queue), embedded pages (/clientportal, /subscription)

**API Layer:**
- Purpose: Authenticated endpoints for admin settings, popups, contact, newsletter
- Location: `src/app/api/` (public), `src/app/api/admin/` (protected)
- Contains: Route handlers, request validation, Supabase writes, cache revalidation
- Depends on: Next.js Route Handlers, Supabase, zod (validation)
- Used by: Frontend forms, admin UI

## Data Flow

### Primary Request Path (Public Page)

1. **HTTP Request** → `src/proxy.ts:proxy()` (src/proxy.ts:37)
   - Middleware extracts Accept-Language, reads NEXT_LOCALE cookie
   - Prepends `/{locale}` to pathname (or redirects if missing)

2. **Route Match** → `src/app/[lang]/layout.tsx:RootLayout()` (src/app/[lang]/layout.tsx:75)
   - Server-side: validates `lang` param against supported locales

3. **Config Load** → `src/lib/store-config.ts:getStoreConfig()` (src/lib/store-config.ts:112)
   - Calls `process.env.TENANT` via `src/config/index.ts:resolveTenant()` (src/config/index.ts:24)
   - Loads static tenant from `src/config/tenants/{tenant-id}/`
   - Calls Supabase to fetch `store_settings` row for sparse overrides
   - Merges via `deepMerge()` (src/config/deep-merge.ts:22)
   - Returns: `{ site, locations, services, customCode }`

4. **Dictionary Load** → `src/app/[lang]/dictionaries.ts:getDictionary()` (async import)
   - Loads `src/dictionaries/{locale}.json` (French or English)
   - Returns: Locale-specific strings for UI chrome

5. **SEO Metadata** → `src/app/[lang]/seo-content.ts:getSeo()` (async import)
   - Loads `src/config/tenants/{tenant-id}/seo.{locale}.json`
   - Returns: Meta tags, OG images, structured data text

6. **Page Render** → Components compose with data
   - Header: uses `site`, `locale`
   - Gallery: uses `CARD_IMAGES` constant
   - BookingWidget: uses `site.storeId`, `site.widgetHost`, `locale`
   - LocationsSection: uses `locations`
   - Footer: uses `site`, `dict`

7. **Response** → Browser renders HTML + JS bundles
   - Inline `<script data-store={storeId}>` on BookingWidget mount
   - React hydrates client components
   - useEffect in BookingWidget fires: script loads from `site.widgetHost`

### Standalone Kiosk Path (/checkin, /clientportal, /subscription, /queue)

1. **HTTP Request** → `src/proxy.ts:proxy()` (src/proxy.ts:37)
   - Matches `STANDALONE_PATHS` set (src/proxy.ts:13)
   - **Does NOT** prepend locale, passes through as-is

2. **Route Match** → `src/app/checkin/layout.tsx:CheckinLayout()` (src/app/checkin/layout.tsx:24)
   - Minimal HTML shell (no Header, Footer, popups)
   - **force-dynamic** directive forces render-time resolution (src/app/checkin/layout.tsx:13)

3. **Config Load** → Same as primary path (step 3 above)
   - Tenant resolved at render time from `process.env.TENANT`
   - favicon set in metadata

4. **Widget Mount** → `src/app/checkin/page.tsx:CheckinPage()`
   - Renders `<CheckinWidget storeId={site.storeId} />`

5. **Widget Injection** → `src/components/WidgetEmbed.tsx:WidgetEmbed()` (src/components/WidgetEmbed.tsx:14)
   - useEffect injects `<script src={src} data-store={storeId}>`
   - SalonX widget mounts as sibling DOM node
   - Error overlay shown if script fails to load
   - Retry button bumps `attempt` state, re-runs effect

### Admin Settings Update

1. **Form Submit** → `src/app/api/admin/settings/route.ts:PUT()` (src/app/api/admin/settings/route.ts:20)
   - Validate session (guard middleware)
   - Parse & validate request body (zod schema)

2. **Supabase Write** → `src/lib/store-settings-store.ts:upsertStoreSettings()`
   - Updates `store_settings` row for active tenant (identified by `tenant.id`)

3. **Cache Revalidation** → `src/app/api/admin/settings/route.ts:39-41` (src/app/api/admin/settings/route.ts:39)
   - Calls `revalidateTag(`store-config:${tenant.id}`)`
   - Clears `unstable_cache()` entry in `getStoreConfig()`
   - Next request merges fresh overrides

**State Management:**
- **Per-request:** Config loaded once via React cache (dedup within a render tree)
- **Cross-request:** `unstable_cache()` stores merged config for 60s
- **Invalidation:** Admin API triggers `revalidateTag()` on Supabase write
- **Tenant identity:** `process.env.TENANT` read synchronously at module load; all requests in same container use same tenant

## Key Abstractions

**TenantConfig:**
- Purpose: Represents one branded salon's complete configuration
- Examples: `src/config/tenants/ongles-maily/index.ts`, `src/config/tenants/ongles-charlesbourg/index.ts`
- Pattern: Static TypeScript object with narrowed literal types (for build-time safety)

**TenantSite:**
- Purpose: Salon's brand metadata — name, domain, logo, favicon, storeId, contact, hours
- Examples: `src/config/tenants/ongles-maily/site.ts`
- Pattern: Immutable const object with readonly arrays for nav, routes, hours, etc.

**Location:**
- Purpose: Physical salon address, phone, hours, geo coordinates
- Examples: `src/config/tenants/ongles-maily/location.ts`
- Pattern: TypeScript type `Location` (src/config/types.ts:26); one per tenant

**Service:**
- Purpose: Service menu item — nail enhancement, fill, manicure, pedicure
- Examples: `src/config/tenants/ongles-maily/services.ts` (readonly array)
- Pattern: TypeScript type `Service` (src/config/types.ts:18); price + priceTo for AggregateOffer schema

**StoreConfig (Merged Result):**
- Purpose: Runtime-resolved config = static tenant + Supabase sparse overrides
- Pattern: Returned by `getStoreConfig()` (src/lib/store-config.ts:50); immutable (deepMerge creates new objects)

**Locale:**
- Purpose: "fr" | "en" (planned: "es")
- Examples: `src/lib/i18n.ts:6`
- Pattern: Type guard `isLocale()` (src/lib/i18n.ts:24)

**Dictionary:**
- Purpose: Locale-specific UI strings (navigation, footer, form labels)
- Examples: `src/dictionaries/en.json`, `src/dictionaries/fr.json`
- Pattern: JSON files loaded server-side; type inference via `typeof en`

**WidgetEmbed Component:**
- Purpose: Generic wrapper for third-party kiosk widgets (checkin, queue, client-account)
- Pattern: Imperative script injection in useEffect, error boundary with retry overlay
- Control surface: `src`, `store`, `storeAttr`, `fallbackLabel` props

**BookingWidget Component:**
- Purpose: Wrapper for SalonX booking widget
- Pattern: Similar to WidgetEmbed but lighter (no retry); dedup guard on mount
- Control surface: `storeId`, `widgetHost`, `locale` props

## Entry Points

**Web Browser (Public Pages):**
- Location: `src/app/[lang]/layout.tsx` (root), `src/app/[lang]/page.tsx` (homepage)
- Triggers: HTTP GET to `/` or `/{locale}/*`
- Responsibilities: Load config, render page, compose components, hydrate client

**Kiosk Pages:**
- Location: `src/app/checkin/page.tsx`, `src/app/clientportal/page.tsx`, `src/app/subscription/page.tsx`, `src/app/queue/page.tsx`
- Triggers: HTTP GET to `/checkin`, `/clientportal`, `/subscription`, `/queue` (no locale prefix)
- Responsibilities: Load tenant, render minimal shell, inject widget script

**Admin Panel:**
- Location: `src/app/admin/page.tsx`
- Triggers: HTTP GET to `/admin` (after session auth in middleware)
- Responsibilities: Render admin UI, fetch current settings, display overrides

**API (Forms & Admin):**
- Location: `src/app/api/contact/route.ts`, `src/app/api/newsletter/route.ts`, `src/app/api/admin/settings/route.ts`, etc.
- Triggers: HTTP POST/PUT from forms, admin requests
- Responsibilities: Validate, write to Supabase/email provider, revalidate cache

## Architectural Constraints

- **Threading:** Single-threaded event loop (Node.js). Supabase queries are awaited sequentially; no worker threads.
- **Global state:** `process.env.TENANT` read once at startup (module-level in `src/config/index.ts:35`); all requests in container use same tenant. No dynamic switching.
- **Circular imports:** None detected (checked via import paths; config, lib, components have clean deps).
- **Build-time baking:** **CRITICAL:** Do not use static generation on tenant-content routes. `force-dynamic: true` is mandatory on `[lang]`, `/checkin`, `/clientportal`, `/subscription`, `/queue` layouts. Static HTML would bake build-time tenant data, breaking multi-tenancy at runtime.
- **Supabase requirement:** Pages load config from Supabase on every render (cached 60s). Supabase must be accessible; no offline fallback. Admin API requires active session (iron-session cookie).
- **Locale parity:** `src/dictionaries/en.json` and `src/dictionaries/fr.json` must have identical key structure. Missing keys silently become `undefined` at runtime (no build-time type check).

## Anti-Patterns

### Hardcoded Tenant Data

**What happens:** Route handlers or components reference a hardcoded tenant ID or config value instead of calling `resolveTenant()` or `getStoreConfig()`.

**Why it's wrong:** Breaks multi-tenancy; the route would always use the same tenant regardless of `process.env.TENANT` or Supabase overrides.

**Do this instead:** Always import from `@/config` (via `resolveTenant()` or public re-exports like `site`, `locations`) or call `getStoreConfig()` on the server side. Example: `src/app/api/admin/settings/route.ts:6` imports `tenant` directly for cache tagging.

### Static HTML Generation on Tenant Routes

**What happens:** Using Next.js static generation (`export const revalidate = 60` or default) on routes like `src/app/[lang]/layout.tsx` or `src/app/checkin/layout.tsx`.

**Why it's wrong:** Build-time pre-rendering bakes the build-time `process.env.TENANT` value into HTML. At runtime, when a container sets a different `TENANT`, the HTML is already static and doesn't re-resolve.

**Do this instead:** Set `export const dynamic = "force-dynamic"` on every layout/page that calls `getStoreConfig()`. Examples: `src/app/[lang]/layout.tsx:35`, `src/app/checkin/layout.tsx:13`.

### Synchronous Supabase Calls in Client Components

**What happens:** A client component tries to fetch Supabase data without a server-side intermediary (would require exposing Supabase credentials to the browser).

**Why it's wrong:** Supabase client-side auth is weaker; credentials leak; breaks multi-tenancy (client can't know which tenant it's serving).

**Do this instead:** Load all tenant/config data on the server side (layout, page, or API route). Client components receive data as props. Examples: `src/app/[lang]/layout.tsx:83` calls `getStoreConfig()` server-side, passes `site` to `<Header site={site} />`.

### Mutating Config Objects

**What happens:** Code modifies a returned config object in-place: `config.site.name = "New Name"` or `config.services.push(newService)`.

**Why it's wrong:** Cached config is shared across requests; mutations leak to other requests.

**Do this instead:** Always create new objects via spread operator or immutable utilities. Example: `src/lib/store-config.ts:37-44` uses spread to create new service objects when applying price overrides.

## Error Handling

**Strategy:** Fail fast with descriptive errors; distinguish user-facing (UI) from developer (logs) messages.

**Patterns:**
- **Unknown tenant:** `src/config/index.ts:28` throws loud error listing valid tenants rather than silently serving default.
- **Invalid locale:** `src/app/[lang]/layout.tsx:80` calls `notFound()` (404 response) if `lang` param is invalid.
- **Supabase unavailable:** `src/lib/store-config.ts:101-107` falls back to static config (uncached) if `unstable_cache()` throws.
- **Widget load failure:** `src/components/WidgetEmbed.tsx:49-51` sets `status: "error"`, shows user-facing message + retry button.
- **Invalid request body:** `src/app/api/admin/settings/route.ts:24-29` catches JSON parse error, returns 400 with message.

## Cross-Cutting Concerns

**Logging:** No explicit logging library (console deprecated in codebase). Admin errors logged to Next.js server logs.

**Validation:** 
- Routes: `isLocale()` guard on `[lang]` routes
- API bodies: Zod schema validation (e.g., `src/app/api/admin/settings/route.ts:31`)

**Authentication:** 
- Admin routes: iron-session cookie validated in `src/proxy.ts:22` (hasValidSession)
- Public routes: No auth required

**Multi-tenancy:** 
- Runtime env var `TENANT` selects active tenant
- All config lookups are keyed on `tenant.id`
- Cache tags include tenant ID for safe invalidation

---

*Architecture analysis: 2026-06-17*
