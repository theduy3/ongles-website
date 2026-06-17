# Codebase Structure

**Analysis Date:** 2026-06-17

## Directory Layout

```
ongles-website/
├── src/                              # Source code root
│   ├── app/                          # Next.js App Router pages & layouts
│   │   ├── [lang]/                   # Locale-aware routes (FR + EN)
│   │   │   ├── layout.tsx            # Root layout with Header, Footer, popups
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── dictionaries.ts       # Locale string loader
│   │   │   └── seo-content.ts        # SEO metadata per locale & tenant
│   │   ├── checkin/                  # Kiosk: /checkin (standalone, no locale)
│   │   │   ├── layout.tsx            # Minimal layout, force-dynamic
│   │   │   └── page.tsx              # Renders CheckinWidget
│   │   ├── clientportal/             # Widget: /clientportal (standalone)
│   │   │   ├── layout.tsx            # Minimal layout, force-dynamic
│   │   │   └── page.tsx              # Renders ClientPortalWidget
│   │   ├── subscription/             # Widget: /subscription (standalone)
│   │   │   ├── layout.tsx            # Minimal layout, force-dynamic
│   │   │   └── page.tsx              # Renders SubscriptionWidget
│   │   ├── queue/                    # Kiosk: /queue (standalone)
│   │   │   ├── layout.tsx            # Minimal layout, force-dynamic
│   │   │   └── page.tsx              # Renders QueueWidget
│   │   ├── admin/                    # Admin panel /admin (auth-gated)
│   │   │   ├── layout.tsx            # Admin shell
│   │   │   └── page.tsx              # Settings UI
│   │   ├── api/                      # API routes
│   │   │   ├── contact/route.ts      # POST contact form
│   │   │   ├── newsletter/route.ts   # POST newsletter signup
│   │   │   ├── popups/route.ts       # GET popup data
│   │   │   └── admin/                # Protected admin endpoints
│   │   │       ├── settings/route.ts # GET/PUT store settings
│   │   │       ├── login/route.ts    # POST login (session)
│   │   │       ├── upload/route.ts   # POST image upload
│   │   │       └── popups/[id]/route.ts # Popup CRUD
│   │   ├── globals.css               # Global styles (Tailwind)
│   │   ├── icon.png                  # Favicon
│   │   ├── manifest.ts               # PWA metadata
│   │   ├── robots.ts                 # robots.txt generator
│   │   └── sitemap.ts                # sitemap.xml generator
│   │
│   ├── components/                   # React UI components
│   │   ├── Header.tsx                # Navigation, brand logo
│   │   ├── Footer.tsx                # Footer with contact, nav
│   │   ├── BookingWidget.tsx         # SalonX booking widget wrapper
│   │   ├── WidgetEmbed.tsx           # Generic kiosk widget loader
│   │   ├── CheckinWidget.tsx         # /checkin wrapper
│   │   ├── ClientPortalWidget.tsx    # /clientportal wrapper
│   │   ├── SubscriptionWidget.tsx    # /subscription wrapper
│   │   ├── QueueWidget.tsx           # /queue wrapper
│   │   ├── Gallery.tsx               # Photo gallery (service portfolio)
│   │   ├── LocationsSection.tsx      # Location cards + map
│   │   ├── ReviewCard.tsx            # Individual review component
│   │   ├── Testimonials.tsx          # Testimonial carousel
│   │   ├── ServicePhoto.tsx          # Service image display
│   │   ├── ContactForm.tsx           # Contact form (POST to /api/contact)
│   │   ├── NewsletterForm.tsx        # Newsletter form (POST to /api/newsletter)
│   │   ├── FloatingCTA.tsx           # Floating action button (phone/booking)
│   │   ├── PopupHost.tsx             # Popup container (client-side)
│   │   ├── PopupRich.tsx             # Popup content with HTML
│   │   ├── CustomCodeHost.tsx        # Custom <head> code injector
│   │   ├── LocaleSwitch.tsx          # Language switcher
│   │   ├── JsonLd.tsx                # Structured data (schema.org)
│   │   ├── Button.tsx                # Reusable button component
│   │   ├── WhyChooseUs.tsx           # Feature section
│   │   ├── GiftCards.tsx             # Gift card CTA
│   │   ├── SalonCard.tsx             # Location/salon card
│   │   ├── Accordion.tsx             # FAQ accordion
│   │   ├── Reveal.tsx                # Scroll-in animation wrapper
│   │   ├── Stars.tsx                 # Star rating display
│   │   └── LegalDocument.tsx         # Terms/privacy page
│   │
│   ├── config/                       # Tenant configuration
│   │   ├── index.ts                  # Tenant registry & resolver
│   │   ├── types.ts                  # TypeScript types (TenantSite, Location, Service)
│   │   ├── deep-merge.ts             # Object merge utility
│   │   ├── resolve-tenant.test.ts    # Tenant resolver tests
│   │   ├── deep-merge.test.ts        # Deep merge tests
│   │   ├── no-client-tenant-import.test.ts # Ensure no client-side tenant refs
│   │   └── tenants/                  # Per-tenant static configs
│   │       ├── ongles-maily/         # Primary tenant (default, 3 locations)
│   │       │   ├── index.ts          # Tenant registry entry
│   │       │   ├── site.ts           # Brand metadata (name, logo, storeId, hours)
│   │       │   ├── location.ts       # Single location (address, phone, geo)
│   │       │   ├── services.ts       # Service menu (nail enhancements, fills, manicure, pedicure)
│   │       │   ├── content.fr.json   # French marketing copy (legacy, in process of migration)
│   │       │   ├── content.en.json   # English marketing copy (legacy)
│   │       │   ├── seo.fr.json       # French SEO metadata (merged with overrides at runtime)
│   │       │   └── seo.en.json       # English SEO metadata
│   │       ├── ongles-charlesbourg/  # Secondary tenant (Charlesbourg location)
│   │       ├── ongles-rivieres/      # Tertiary tenant (Rivieres location)
│   │       └── template/             # Template tenant (onboarding skeleton)
│   │
│   ├── dictionaries/                 # Locale-invariant UI strings
│   │   ├── en.json                   # English: nav, footer, button labels, form labels
│   │   └── fr.json                   # French: identical keys as en.json, translated values
│   │
│   ├── lib/                          # Utilities and data fetching
│   │   ├── store-config.ts           # Config merger: static + Supabase overrides, caching
│   │   ├── store-config.test.ts      # Merger tests
│   │   ├── store-settings-store.ts   # Supabase read/write for admin settings
│   │   ├── store-settings-schema.ts  # Zod schema for settings validation
│   │   ├── i18n.ts                   # Locale detection, helpers
│   │   ├── seo.ts                    # SEO metadata builders (OG, structured data)
│   │   ├── seo.test.ts               # SEO builder tests
│   │   ├── seo-dictionary.ts         # SEO copy utilities
│   │   ├── locations.ts              # Location utilities (re-export of config)
│   │   ├── locations.test.ts         # Location tests
│   │   ├── salons.ts                 # Salon/location helpers
│   │   ├── services.ts               # Service menu utilities
│   │   ├── gallery.ts                # Gallery image paths
│   │   ├── reviews.ts                # Review data/aggregation
│   │   ├── popups-store.ts           # Supabase popup CRUD
│   │   ├── popup.ts                  # Popup type definitions
│   │   ├── popup-draft.ts            # Admin popup editor state
│   │   ├── dictionary.ts             # Dictionary loader helper
│   │   ├── admin-http.ts             # Admin API utilities (guard, error formatting)
│   │   ├── email.ts                  # Email sending (contact/newsletter)
│   │   ├── route-key.ts              # Route-to-key mapping
│   │   ├── route-key.test.ts         # Route key tests
│   │   ├── format.ts                 # Text formatting (phone, address)
│   │   └── popups-store.ts           # Popup management
│   │
│   ├── data/                         # Static data assets
│   │   └── [data files...]           # Hardcoded data (salons, schedules, etc.)
│   │
│   ├── proxy.ts                      # Next.js middleware (locale routing, auth gate)
│   └── proxy.test.ts                 # Middleware tests
│
├── public/                           # Static assets (served at root)
│   ├── images/                       # Images
│   │   ├── logo.png                  # Default header logo
│   │   ├── home/                     # Homepage hero/section images
│   │   └── services/                 # Service photos (pose-ongles.webp, etc.)
│   └── [other assets]
│
├── e2e/                              # End-to-end tests (Playwright)
│   └── homepage.spec.ts              # Critical user flow tests
│
├── tasks/                            # Project planning (specs & implementation plans)
│   ├── spec-*.md                     # Feature specifications
│   ├── todo-*.md                     # Implementation plans & progress
│   ├── lessons.md                    # Captured project lessons
│   └── [audit reports...]
│
├── .planning/                        # Codebase documentation (planning output)
│   └── codebase/                     # Auto-generated analysis docs
│       ├── ARCHITECTURE.md           # Architecture & data flow
│       ├── STRUCTURE.md              # This file
│       ├── CONVENTIONS.md            # Coding patterns (optional)
│       └── TESTING.md                # Test patterns (optional)
│
├── next.config.ts                    # Next.js build & runtime config
├── tsconfig.json                     # TypeScript config
├── eslint.config.mjs                 # ESLint rules
├── postcss.config.mjs                # PostCSS (Tailwind)
├── playwright.config.ts              # E2E test config
├── package.json                      # Dependencies & scripts
├── bun.lock                          # Lockfile (bun)
├── Dockerfile                        # Multi-tenant Docker image
├── env.example                       # Example environment variables
└── README.md                         # Project documentation
```

## Directory Purposes

**src/app:**
- Next.js App Router: all user-facing pages and API routes
- Locale-aware routes under `[lang]` for public pages
- Standalone routes (`/checkin`, `/clientportal`, `/subscription`, `/queue`) outside locale prefix
- Admin panel and protected API endpoints
- Global layout, styles, metadata

**src/components:**
- Reusable React components: UI blocks, widgets, forms
- Mix of Server Components (Gallery, LocationsSection) and Client Components (BookingWidget, PopupHost)
- Widget wrappers that instantiate third-party SalonX scripts
- All styled with Tailwind CSS classes

**src/config:**
- Per-tenant static configuration (site, location, services)
- TypeScript types for config objects
- Tenant registry and runtime resolver (resolveTenant)
- Deep-merge utility for config composition

**src/dictionaries:**
- Locale-specific UI strings (French & English)
- Must have identical key structure across locales
- Loaded server-side, never bundled to client

**src/lib:**
- Utilities: I18n, SEO, form handling, Supabase data access
- Store config merger: combines static + Supabase overrides
- Admin helpers (session guard, error formatting)
- Tests collocated with utilities (*.test.ts)

**public/:**
- Static images, icons, media served as `/images/*`
- Service photos, hero images, logo
- Never directly referenced in code; use Next.js Image component

**tasks/:**
- Project planning: specs (spec-*.md) describe features
- Implementation plans (todo-*.md) track phase completion
- lessons.md captures project knowledge

## Key File Locations

**Entry Points:**

- `src/proxy.ts` — Middleware (locale routing, auth gate, standalone path bypass)
- `src/app/[lang]/layout.tsx` — Root layout (public pages with locale)
- `src/app/[lang]/page.tsx` — Homepage
- `src/app/checkin/page.tsx` — Checkin kiosk page
- `src/app/clientportal/page.tsx` — Client portal widget page
- `src/app/subscription/page.tsx` — Subscription widget page
- `src/app/queue/page.tsx` — Queue kiosk page
- `src/app/admin/page.tsx` — Admin settings panel

**Configuration:**

- `src/config/index.ts` — Tenant resolver (reads process.env.TENANT, returns config)
- `src/config/types.ts` — TypeScript types (TenantSite, Location, Service, etc.)
- `src/config/tenants/ongles-maily/site.ts` — Primary tenant brand metadata
- `src/config/tenants/ongles-maily/location.ts` — Primary tenant physical location
- `next.config.ts` — Build config (security headers, image optimization)
- `tsconfig.json` — TypeScript strictness settings

**Core Logic:**

- `src/lib/store-config.ts` — Config merger: static + Supabase overrides, React cache, unstable_cache
- `src/lib/store-settings-store.ts` — Supabase read/write for admin overrides
- `src/config/deep-merge.ts` — Immutable object merge algorithm

**Widgets & Components:**

- `src/components/WidgetEmbed.tsx` — Generic imperative script loader (used by kiosks)
- `src/components/BookingWidget.tsx` — SalonX booking widget wrapper
- `src/components/CheckinWidget.tsx` — /checkin widget wrapper
- `src/components/ClientPortalWidget.tsx` — /clientportal widget wrapper
- `src/components/SubscriptionWidget.tsx` — /subscription widget wrapper
- `src/components/Header.tsx` — Navigation, brand logo, locale switch
- `src/components/Footer.tsx` — Contact, nav, social

**Locale & SEO:**

- `src/lib/i18n.ts` — Locale detection, helpers, type guards
- `src/dictionaries/en.json`, `src/dictionaries/fr.json` — UI strings
- `src/app/[lang]/dictionaries.ts` — Locale string loader
- `src/app/[lang]/seo-content.ts` — SEO metadata generator (per locale, per tenant)
- `src/lib/seo.ts` — SEO builders (OG, structured data, robots)

**Testing:**

- `e2e/homepage.spec.ts` — E2E test (Playwright)
- `src/proxy.test.ts` — Middleware tests
- `src/config/resolve-tenant.test.ts` — Tenant resolver tests
- `src/config/deep-merge.test.ts` — Merge algorithm tests
- `src/lib/store-config.test.ts` — Config merger tests
- `src/lib/seo.test.ts` — SEO builder tests

## Naming Conventions

**Files:**

- **Pages:** `page.tsx` (Next.js convention)
- **Layouts:** `layout.tsx` (Next.js convention)
- **Routes:** `route.ts` (Next.js convention for API handlers)
- **Components:** PascalCase (`Header.tsx`, `BookingWidget.tsx`)
- **Utilities:** camelCase (`seo.ts`, `store-config.ts`)
- **Tests:** `*.test.ts` (Jest/Vitest convention)
- **Types:** `types.ts` or `*-schema.ts` for Zod schemas

**Directories:**

- **Locale routes:** `[lang]` (square bracket = dynamic segment in Next.js)
- **API routes:** Nested under `api/` (e.g., `api/admin/settings/route.ts`)
- **Feature folders:** Named by feature (`checkin/`, `clientportal/`, `subscription/`)
- **Tenants:** Named by domain/brand (`ongles-maily/`, `ongles-charlesbourg/`)
- **Utilities:** Grouped by domain (`lib/`, `config/`, `components/`)

**Variables & Functions:**

- **camelCase for functions, variables:** `resolveTenant()`, `getStoreConfig()`, `isLocale()`
- **CONSTANT_CASE for immutable singletons:** `STANDALONE_PATHS`, `LOCALE_COOKIE`
- **PascalCase for React components:** `<Header />`, `<BookingWidget />`
- **PascalCase for types:** `TenantSite`, `Location`, `Service`, `Locale`

## Where to Add New Code

**New Feature (e.g., /testimonials page):**

1. Create page route: `src/app/[lang]/testimonials/page.tsx`
2. Create layout if needed: `src/app/[lang]/testimonials/layout.tsx` (usually inherits from parent)
3. Add components: `src/components/TestimonialCard.tsx`, `src/components/TestimonialSection.tsx`
4. Add SEO content to tenant files: `src/config/tenants/ongles-maily/seo.fr.json` → add `testimonials` key
5. Add UI strings: `src/dictionaries/en.json` and `src/dictionaries/fr.json` → add matching keys
6. Add tests: `src/components/TestimonialCard.test.ts`, `e2e/testimonials.spec.ts`

**New Widget (e.g., /custom-widget):**

1. Create standalone layout: `src/app/custom-widget/layout.tsx` (copy checkin/layout.tsx pattern)
2. Add to STANDALONE_PATHS: `src/proxy.ts:13`
3. Create widget page: `src/app/custom-widget/page.tsx` → renders `<CustomWidget />`
4. Create wrapper component: `src/components/CustomWidget.tsx` → uses `WidgetEmbed` or similar pattern
5. Configure tenant storeId: Update `src/config/tenants/ongles-maily/site.ts` if needed
6. Test: Create `src/app/custom-widget/layout.test.ts` → verify force-dynamic, favicon resolution

**New Admin Setting (e.g., custom email template):**

1. Extend Zod schema: `src/lib/store-settings-schema.ts` → add field
2. Update Supabase table schema (not in repo; done in console)
3. Extend store loader: `src/lib/store-settings-store.ts` → query new field
4. Add admin UI: `src/app/admin/page.tsx` → add form input
5. Add validation: Zod schema already handles it
6. Test: `src/lib/store-config.test.ts` → add merge test case

**New Tenant (e.g., ongles-west):**

1. Create tenant directory: `src/config/tenants/ongles-west/`
2. Add files: `index.ts`, `site.ts`, `location.ts`, `services.ts`, `seo.fr.json`, `seo.en.json`, `content.fr.json`, `content.en.json`
3. Register in tenant registry: `src/config/index.ts:15-20` → add import + registry entry
4. Set Supabase row: admin creates `store_settings` row with `tenant_id = "ongles-west"`
5. Test: Set `TENANT=ongles-west` in dev environment, verify homepage loads with correct branding

**New Utility:**

- Create in `src/lib/`: `src/lib/my-utility.ts`
- Add tests: `src/lib/my-utility.test.ts`
- Export from barrel file if shared: `src/lib/index.ts` (if one exists; currently no barrel)
- Import at usage site: `import { myFunction } from "@/lib/my-utility"`

## Special Directories

**src/app/[lang]:**
- Purpose: Locale-aware public routes
- Generated: No (static in repo)
- Committed: Yes
- Pattern: All routes here use `force-dynamic` for tenant resolution, pull config from `getStoreConfig()`, load locale dictionary via `getDictionary(lang)`

**src/app/admin:**
- Purpose: Protected admin panel
- Generated: No
- Committed: Yes
- Pattern: All routes here are gated by session middleware in proxy.ts

**src/app/api/admin:**
- Purpose: Protected API endpoints
- Generated: No
- Committed: Yes
- Pattern: All routes here are gated by session middleware in proxy.ts, cache revalidation on writes

**src/config/tenants:**
- Purpose: Static per-tenant configuration
- Generated: No (hand-maintained)
- Committed: Yes
- Pattern: One folder per tenant; immutable const objects; no client-side code

**public/images:**
- Purpose: Static images served at `/images/*`
- Generated: Partially (new service photos added manually)
- Committed: Yes (images in git)
- Pattern: Service photos named `src/images/services/{serviceId}.webp`; home section images in `src/images/home/`

**src/dictionaries:**
- Purpose: Locale strings (never bundled to client)
- Generated: No (hand-maintained)
- Committed: Yes
- Pattern: JSON files; must have identical keys across locales; type-safe via `typeof en`

**e2e:**
- Purpose: End-to-end tests
- Generated: No (hand-written)
- Committed: Yes
- Pattern: Playwright tests; critical user flows only; run on deployment

---

*Structure analysis: 2026-06-17*
