# Phase 05: llms.txt Depth + Measurement — Research

**Researched:** 2026-06-19
**Domain:** GA4 analytics, Consent Mode v2, web-vitals, llms.txt generation, trust signals above the fold, NAP consistency
**Confidence:** HIGH (all core findings verified against node_modules/next/dist/docs/ and the live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AI-Discovery Layer / llms.txt (LLMS-01, LLMS-02)**
- L-01: Leak fix is locked — ALL prose/facts from resolved tenant config; zero hardcoded city/landmark strings.
- L-02: llms.txt links use `site.canonicalUrl` (I-01 stable origin), not `site.url`.
- L-03: Generated facts (4 services + CAD price ranges, hours, booking path) + hand-authored per-tenant `site.llmsDescription` intro (>200 unique words differentiator).
- L-04: Include Phase-4 pages: `/tarifs`/`/pricing`, 4 comparison pages, the borough near-me page.
- L-05: FR canonical pages lead; "English equivalents" section appended.
- L-06: Depth content = service list + price ranges (generated) + hours + booking path (generated) + Phase-4 page links + hand-authored intro prose.

**Measurement / GA4 (MEAS-01)**
- M-01: Per-tenant GA4 property; measurement ID is a per-tenant config field resolved via `getStoreConfig()`.
- M-02: Consent Mode v2, denied-by-default (Québec Law 25); cookieless pings pre-consent; `gtag('consent','update',...)` on banner accept.
- M-03: 4 conversion events: call click (tel:), book-online click, contact form submit, directions click.
- M-04: book-online click is the primary GA4 key event; others are secondary.

**Measurement / Core Web Vitals (MEAS-02)**
- M-05: `web-vitals@5.3.0` (approved, not yet installed) wired to same per-tenant GA4 property as GA4 events.

**Conversion Surfaces (CONV-01, CONV-02)**
- C-01: Keep existing `FloatingCTA` pill (already site-wide in `layout.tsx`); verify mobile visibility + instrument clicks.
- C-02: 3 above-fold signals: star rating + review count (R-02 gated: ≥5 fresh reviews), years-experience badge (always available), price-from anchor ("à partir de $X") linking to pricing page.
- C-03: Target pages: home, `/services/[slug]`, `/tarifs`/`/pricing`, comparison + near-me (lighter treatment).

**NAP Consistency (LOCAL-01)**
- N-01: Single config source-of-truth + guard asserting NAP identity across all surfaces per tenant.
- N-02: Documented per-tenant NAP reference for GBP/directory alignment. Off-site profile creation out of scope.

### Claude's Discretion (left to research / planning)
- Exact GA4 loading mechanism (`next/third-parties` vs hand-rolled `<Script>`), consent-banner mount point.
- Consent-banner UX (copy, persistence via cookie/localStorage, FR/EN strings location).
- Per-tenant config field names for `llmsDescription` and GA4 measurement ID, and their completeness-guard wiring.
- llms.txt section ordering/formatting within L-03/L-06 (markdown structure, EN equivalents grouping).
- Whether the leak guard is a new test or extends an existing one.
- Event-payload shape for GA4 conversion events (event names, params) and whether web-vitals events reuse the same gtag.
- Exact above-the-fold placement/markup for C-02 signals on each page.
- Form/format of the N-02 NAP reference artifact.
- Native AI-Assistant channel reliance vs manual Perplexity-regex custom channel.

### Deferred Ideas (OUT OF SCOPE)
- GBP / external directory profile creation + off-site link-building.
- Full-width mobile sticky CTA bar (replacing FloatingCTA pill).
- Tracking booking completion inside third-party widget (cross-origin limit).
- Server-side / Measurement Protocol conversion tracking.
- ES-locale llms.txt / pages.
- Dedicated RUM tooling beyond GA4 web-vitals events.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LLMS-01 | `llms.txt` facts per-tenant via `site.llmsDescription`; no hardcoded cross-tenant prose | Leak identified at lines 10 + 25–26 of `route.ts`; fix pattern in Architecture Patterns section |
| LLMS-02 | `llms.txt` content deepened per tenant (services, locations, hours, booking) | Generated facts pattern from `getStoreConfig()` documented; word-count guard wired via `schema-invariants.ts` |
| LOCAL-01 | Name/address/phone/hours consistent across all on-site surfaces; documented for external alignment | NAP surface map documented; N-01 guard pattern identified; N-02 format recommended as generated file |
| CONV-01 | Mobile pages show sticky book/quote CTA visible above fold | FloatingCTA already mounted; `async` server component — must convert to client island to instrument clicks; mobile verification approach documented |
| CONV-02 | Trust signals and price anchors above the fold on key pages | Existing trust components identified; insertion points per page documented; R-02 gate integration clarified |
| MEAS-01 | GA4 captures AI-referrer traffic and conversion events at page level | GA4 load mechanism decided (hand-rolled `<Script>` — `next/third-parties` absent in Next.js 16.2.6); Consent Mode v2 init order documented; event payload shapes specified |
| MEAS-02 | Real-user INP (and other CWV) reported via `web-vitals` | `useReportWebVitals` from `next/web-vitals` confirmed (built-in bundled `web-vitals`); external `web-vitals@5.3.0` NOT needed — see Standard Stack section |
</phase_requirements>

---

## Summary

Phase 5 spans four disjoint sub-problems on a brownfield Next.js 16.2.6 multi-tenant site: (1) fix a cross-tenant data leak in `src/app/llms.txt/route.ts` and deepen each tenant's output, (2) stand up GA4 analytics with Consent Mode v2 for Québec Law 25 compliance, (3) wire web-vitals CWV reporting, and (4) instrument conversion events and place trust signals above the fold.

The most important discovery: **`next/third-parties` does not exist in Next.js 16.2.6.** The package.json exports map has no `./third-parties` entry and the module is not installed. GA4 must be loaded via hand-rolled `next/script` `<Script>` components directly in `src/app/[lang]/layout.tsx`. Similarly, **`web-vitals@5.3.0` is approved-but-not-installed** — however, Next.js 16.2.6 already bundles `web-vitals` internally and exposes `useReportWebVitals` via `next/web-vitals`. The planner should use `next/web-vitals` directly rather than adding the external package; this avoids the dual-lockfile trap and the `bun install` requirement. If the external package is genuinely needed (e.g., for attribution mode), install it via `bun add web-vitals@5.3.0`.

The GA4 load pattern in `layout.tsx` (a Server Component) requires careful sequencing: the Consent Mode v2 denied-by-default init must run as an inline `<Script strategy="beforeInteractive">` before the gtag.js `<Script strategy="afterInteractive">` loads. The consent banner itself is a `'use client'` island; `onLoad`/`onReady` props on `<Script>` are forbidden in Server Components and may only be used in Client Components. The FloatingCTA is currently `async` (Server Component fetching `getStoreConfig()`) — instrumenting click events requires either converting it to a Client Component or adding a thin client wrapper.

**Primary recommendation:** Load GA4 via two `<Script>` blocks in `layout.tsx` (inline beforeInteractive consent init + afterInteractive gtag.js src); mount a `ConsentBanner` client island in the same layout; create `WebVitalsReporter` and `GtagProvider` client islands; instrument FloatingCTA, ContactForm, and directions links with `window.gtag()` calls in their client boundaries.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GA4 script loading + Consent Mode init | Frontend Server (SSR/layout) | — | `<Script>` in Server Component layout renders HTML-side; consent default must precede gtag.js load |
| Consent banner UI + persistence | Browser / Client | — | Requires `useState`/`useEffect`/localStorage; must be `'use client'` island |
| Conversion event emission (clicks/submit) | Browser / Client | — | Click handlers need browser context; `window.gtag()` calls; client components only |
| web-vitals CWV reporting | Browser / Client | — | `useReportWebVitals` hook requires `'use client'`; mounts in layout as island |
| llms.txt generation | API / Backend | — | Route handler (`GET`), server-side, resolves tenant config at request time |
| Config completeness guards | Build-time | — | `schema-invariants.ts` runs in `next.config.ts` during `next build` |
| NAP consistency assertion | Build-time | — | Same guard context as completeness checks |
| Trust signals above fold | Frontend Server (SSR) | — | Server Component pages read `site.reviews`, `services[].price` from `getStoreConfig()` |
| GA4 measurement ID resolution | API / Backend | Frontend Server | Resolved from `getStoreConfig()` on server; passed as prop to client island |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/script` | built-in (Next.js 16.2.6) | GA4 gtag.js load + inline Consent Mode v2 init | Only supported mechanism — `next/third-parties` absent in this version |
| `next/web-vitals` | built-in (Next.js 16.2.6) | CWV reporting via `useReportWebVitals` | Bundled by Next.js; includes onINP, onLCP, onCLS, onFCP, onTTFB; no extra install |
| `window.gtag` (hand-rolled) | — | Conversion event emission + consent update | Standard GA4 gtag.js pattern; no wrapper library needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `localStorage` (browser) | native | Consent choice persistence | Same pattern as PopupHost.tsx in this codebase |
| `react` `useState`/`useEffect` | 19.2.4 (installed) | Consent banner interactivity | Client islands only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/script` (hand-rolled) | `next/third-parties` GoogleAnalytics | `next/third-parties` absent in Next.js 16.2.6 — confirmed via package.json exports map; cannot use |
| `next/web-vitals` (built-in) | `web-vitals@5.3.0` (external) | Built-in is sufficient; adds onINP. External package approved in STATE.md but is redundant and adds lock-file risk. Use external only if attribution mode needed. |
| `localStorage` for consent | `document.cookie` | Cookie survives server-rendering and is sent on requests (useful for SSR consent check); localStorage is simpler and the existing pattern (PopupHost). For MEAS-01 GA4 consent, localStorage is sufficient — consent state only needed client-side. |

**Installation (if external web-vitals chosen):**
```bash
bun add web-vitals@5.3.0
# CRITICAL: run after any dep change per dual-lockfile trap
bun install
```

**Version verification:**
- `next/web-vitals`: confirmed present at `/node_modules/next/web-vitals.js` [VERIFIED: node_modules/next/dist/client/web-vitals.js]
- `next/script`: confirmed present in Next.js 16.2.6 [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md]
- `web-vitals` (bundled by Next.js at next/dist/compiled/web-vitals): includes onINP [VERIFIED: node_modules/next/dist/client/web-vitals.js]

---

## Package Legitimacy Audit

This phase installs no external packages beyond the already-approved `web-vitals@5.3.0` (if chosen). The primary mechanism uses built-in Next.js APIs.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `web-vitals` (optional, built-in used instead) | npm | ~5 yrs | ~15M/wk | github.com/GoogleChrome/web-vitals | OK | Approved (approved in STATE.md); use built-in unless attribution needed |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
    │
    ▼
layout.tsx (Server Component — force-dynamic)
    ├── getStoreConfig() → { site.ga4MeasurementId, site.name, ... }
    ├── <Script strategy="beforeInteractive"> (inline)
    │     └── gtag('consent','default', { ad_storage:'denied', analytics_storage:'denied', ... })
    │         window.dataLayer = []; window.gtag = function(){dataLayer.push(arguments);}
    ├── <Script strategy="afterInteractive" src="gtag.js?id={measurementId}">
    │     └── gtag('js', new Date()); gtag('config', measurementId)
    ├── <ConsentBanner locale={lang} measurementId={site.ga4MeasurementId} /> (Client Island)
    │     ├── localStorage.getItem('ga4_consent') → accepted?
    │     │   ├── YES → gtag('consent','update',{ad_storage:'denied', analytics_storage:'granted'})
    │     │   └── NO → show banner → on accept → gtag('consent','update',...) + localStorage.set
    │     └── FR/EN strings from dict (content.*.json)
    ├── <WebVitalsReporter measurementId={measurementId} /> (Client Island)
    │     └── useReportWebVitals(metric → window.gtag('event', metric.name, {...}))
    ├── <FloatingCTA dict={dict} locale={lang} site={site} /> (→ convert to Client)
    │     ├── book-online link → onClick → gtag('event','book_online_click',{...})
    │     └── tel: link → onClick → gtag('event','call_click',{...})
    └── children (page Server Components)
          ├── ContactForm (existing Client Component)
          │     └── on success → gtag('event','contact_form_submit',{...})
          └── directions links (SalonCard / contact page / near-me pages)
                └── onClick → gtag('event','directions_click',{...})

GA4 Property (per tenant)
    ├── AI-referrer traffic → native AI-Assistant channel (June 2026)
    ├── Perplexity traffic → manual custom regex channel (GA4 console admin step)
    ├── Conversion events: book_online_click (primary key event), call_click, contact_form_submit, directions_click
    └── CWV events: CLS, FCP, FID, INP, LCP, TTFB

/llms.txt route.ts (Request-time per-tenant)
    └── getStoreConfig() → { site.name, site.canonicalUrl, site.llmsDescription,
                              site.contact, site.hours, services, site.routes }
          └── Generated body:
                ├── # {site.name}
                ├── > {site.llmsDescription} (hand-authored per tenant)
                ├── NAP facts (generated from config)
                ├── ## Services (generated from services[])
                ├── ## Hours (generated from site.hours[])
                ├── ## Key pages (canonicalUrl-based links, FR canonical)
                │     ├── Core pages (/services, /tarifs, /faq, /contact, /book-online)
                │     ├── Phase-4 pages (/tarifs, 4 comparison slugs, near-me slug)
                │     └── ## English equivalents (EN locale links)
                └── Response: text/plain; charset=utf-8

Build Guard (next.config.ts → schema-invariants.ts)
    └── assertSchemaInvariants() extends validateSchemaInvariants() with:
          ├── checkLlmsDepth(): llmsDescription present + countWords() >= 200 per non-template tenant
          ├── checkLlmsLeak(): llms.txt body for tenant X must not contain other tenants' city/landmark strings
          ├── checkGA4IdPresent(): ga4MeasurementId non-empty per non-template tenant
          └── checkNapConsistency(): name/phone/address/hours identical across site + location per tenant
```

### Recommended Project Structure (new files only)

```
src/
├── components/
│   ├── ConsentBanner.tsx        # 'use client' — Québec Law 25 banner
│   ├── WebVitalsReporter.tsx    # 'use client' — useReportWebVitals → gtag
│   └── GtagEventEmitter.tsx     # optional: shared gtag call helper (thin, no state)
├── lib/
│   └── gtag.ts                  # pure TS helpers: gtagEvent(), initConsent(), updateConsent()
├── app/[lang]/
│   └── layout.tsx               # ADD: Script blocks + ConsentBanner + WebVitalsReporter mounts
├── config/
│   ├── types.ts                 # ADD: ga4MeasurementId, llmsDescription to TenantSite
│   ├── tenants/{id}/site.ts     # ADD: ga4MeasurementId, llmsDescription per tenant
│   └── schema-invariants.ts     # ADD: checkLlmsDepth, checkLlmsLeak, checkGA4IdPresent, checkNapConsistency
docs/
└── nap-reference.md             # N-02: generated per-tenant NAP reference (or inline in VERIFICATION.md)
```

### Pattern 1: GA4 Load in Server Component Layout (hand-rolled)

`next/script` `<Script>` can be used directly in async Server Components (including `layout.tsx`). `beforeInteractive` scripts are injected into `<head>` server-side. `afterInteractive` is the recommended strategy for analytics. `onLoad`/`onReady` props are forbidden in Server Components — do not use them in `layout.tsx`. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md]

```tsx
// src/app/[lang]/layout.tsx (Server Component)
import Script from 'next/script'

// GA4 measurement ID resolved per-tenant from getStoreConfig()
const { site } = await getStoreConfig()
const measurementId = site.ga4MeasurementId  // e.g., "G-XXXXXXXXXX"

return (
  <html lang={lang}>
    <body>
      {/* Step 1: Consent Mode v2 denied-by-default — MUST run before gtag.js loads */}
      <Script id="gtag-consent-init" strategy="beforeInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent','default',{
          ad_storage:'denied',
          analytics_storage:'denied',
          ad_user_data:'denied',
          ad_personalization:'denied',
          wait_for_update: 500
        });
      `}</Script>

      {/* Step 2: Load gtag.js — analytics_storage stays denied until banner accept */}
      {measurementId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          />
          <Script id="gtag-config" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `}</Script>
        </>
      )}

      {/* Step 3: Client islands */}
      <ConsentBanner locale={lang} measurementId={measurementId} />
      <WebVitalsReporter measurementId={measurementId} />

      {children}
      <FloatingCTA dict={dict} locale={lang} site={site} />
    </body>
  </html>
)
```

**Critical constraint:** The inline `<Script>` with children (no `src`) requires the `id` prop to avoid duplicate injection in React 19. [ASSUMED — consistent with React 19 deduplication behavior; verify at runtime]

### Pattern 2: Consent Banner Client Island

```tsx
// src/components/ConsentBanner.tsx
'use client'
import { useState, useEffect } from 'react'

const CONSENT_KEY = 'ga4_consent'

export function ConsentBanner({
  locale,
  measurementId,
}: { locale: 'fr' | 'en'; measurementId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'accepted') {
      // User previously accepted — update consent immediately
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',  // Law 25: advertising cookies still denied unless explicitly opted-in
      })
    } else if (!stored) {
      setShow(true)  // First visit — show banner
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
    })
    setShow(false)
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setShow(false)
  }

  if (!show) return null
  return (
    <div role="dialog" aria-label={locale === 'fr' ? 'Préférences de témoins' : 'Cookie preferences'}>
      {/* FR/EN copy — see Discretion item: strings go in config/base/content.*.json */}
      <button onClick={accept}>{locale === 'fr' ? 'Accepter' : 'Accept'}</button>
      <button onClick={decline}>{locale === 'fr' ? 'Refuser' : 'Decline'}</button>
    </div>
  )
}
```

**FR/EN copy location:** Consent banner strings must go in `src/config/base/content.*.json` (runtime UI dict), NOT `src/dictionaries/*.json` (type-only). The `content.*.json` files feed the composed dictionary via `composeDictionary()`. Add a `consent` key to `content.en.json` and `content.fr.json` with identical structure. [VERIFIED: codebase — `src/app/[lang]/dictionaries.ts` imports from `@/config/base/content.*.json`]

### Pattern 3: Web Vitals Reporter (Client Island)

`useReportWebVitals` is imported from `next/web-vitals` (NOT the external `web-vitals` package). Next.js 16.2.6 bundles this at `node_modules/next/web-vitals.js` → `next/dist/client/web-vitals.js`. It calls `onCLS, onFID, onLCP, onINP, onFCP, onTTFB` internally. [VERIFIED: node_modules/next/dist/client/web-vitals.js]

```tsx
// src/components/WebVitalsReporter.tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'
import { useCallback } from 'react'

// Source: Next.js docs — useReportWebVitals + Google Analytics pattern
// https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals
export function WebVitalsReporter({ measurementId }: { measurementId: string }) {
  const handleMetric = useCallback(
    (metric: Parameters<typeof useReportWebVitals>[0]) => {
      if (!measurementId) return
      window.gtag?.('event', metric.name, {
        // CLS value needs integer scaling (Google Analytics requirement per docs)
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,     // unique to current page load
        non_interaction: true,       // does not affect bounce rate
        metric_rating: metric.rating, // 'good'|'needs-improvement'|'poor'
      })
    },
    [measurementId],
  )
  useReportWebVitals(handleMetric)
  return null
}
```

**Metric object shape:** `{ name, id, delta, value, rating, entries, navigationType }`. `name` values: `CLS`, `FCP`, `FID`, `INP`, `LCP`, `TTFB`. `rating` is `"good"`, `"needs-improvement"`, or `"poor"`. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-report-web-vitals.md]

### Pattern 4: Conversion Event Emission

GA4 event names and param shapes (hand-rolled `window.gtag`):

```typescript
// src/lib/gtag.ts — pure helpers (no React, no side effects)
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function gtagEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  window.gtag?.('event', name, params)
}

// Conversion event emitters (M-03)
export const ga4Events = {
  bookOnlineClick: (location: string) =>
    gtagEvent('book_online_click', { event_category: 'conversion', salon_location: location }),
  callClick: (phone: string) =>
    gtagEvent('call_click', { event_category: 'conversion', phone_number: phone }),
  contactFormSubmit: () =>
    gtagEvent('contact_form_submit', { event_category: 'conversion' }),
  directionsClick: (location: string) =>
    gtagEvent('directions_click', { event_category: 'engagement', salon_location: location }),
} as const
```

**FloatingCTA instrumentation:** The current `FloatingCTA` is an `async` Server Component calling `getStoreConfig()`. To instrument clicks, convert it to a Client Component or split it: Server Component resolves `site` and passes `phoneHref` + `bookHref` as props to a thin `FloatingCTAButtons` client island that wraps the `<a>` tags in `onClick` handlers calling `ga4Events.bookOnlineClick()` / `ga4Events.callClick()`.

**ContactForm instrumentation:** Already `'use client'`. In the `try { ... setStatus('success') }` block, add `ga4Events.contactFormSubmit()` after `setStatus('success')`. [VERIFIED: src/components/ContactForm.tsx line 30]

**Directions links:** `mapLink()` in `src/lib/locations.ts` generates `google.com/maps/search/?api=1&query=...` links. These appear in `SalonCard.tsx`, `contact/page.tsx`, and near-me pages. Add an `onClick` handler in the rendered `<a>` for the directions link. Since `SalonCard` is a Client Component, this is straightforward.

### Pattern 5: llms.txt Leak Fix

Current `src/app/llms.txt/route.ts` bugs:
1. Line 10: `const base = \`\${site.url}/\${defaultLocale}\`` — should use `site.canonicalUrl`.
2. Line 15: `> Professional nail salon at Carrefour Beauport, Québec City…` — hardcoded; wrong for charlesbourg (Carrefour Charlesbourg) and rivieres (Centre Les Rivières). Replace with `site.llmsDescription`.
3. Line 25: `[Location](${base}/locations): map and directions to **Carrefour Beauport**` — hardcoded landmark. Replace with `site.contact.landmark`.

Deepened route structure (L-03/L-06):
```typescript
// Generated facts from getStoreConfig() — never drift from config
const { site, services } = await getStoreConfig()
const base = `${site.canonicalUrl}/${defaultLocale}`  // L-02: canonicalUrl not site.url
const enBase = `${site.canonicalUrl}/en`

// Hours formatting — use site.hours (OpeningHoursSpecification array)
const hoursLines = site.hours.map(h =>
  `- ${h.days.join('/')} ${h.opens}–${h.closes}`
).join('\n')

// Services with price ranges
const serviceLines = services.map(s =>
  `- ${s.id}: $${s.price}–$${s.priceTo ?? s.price} CAD`
).join('\n')

// Near-me route (last entry in site.routes that is a borough slug like /beauport)
const nearMeRoute = site.routes.at(-1)  // e.g. "/beauport", "/charlesbourg", "/trois-rivieres"

const body = `# ${site.name}

> ${site.llmsDescription}

## Contact & Location
- Address: ${site.contact.address.line1}, ${site.contact.address.line2}
- Landmark: ${site.contact.landmark}
- Phone: ${site.contact.phone}
- Email: ${site.contact.email}
- Languages: Français (canonical), English

## Hours
${hoursLines}

## Services & Pricing (CAD)
${serviceLines}

## Booking
- Book online: ${base}${site.booking}

## Key Pages (FR — canonical)
- [Services](${base}/services): tarifs et détails de nos 4 services
- [Tarifs](${base}/tarifs): grille tarifaire complète
- [FAQ](${base}/faq): heures, réservation et hygiène
- [Contact](${base}/contact): adresse, directions et formulaire
- [Réserver en ligne](${base}/book-online): prise de rendez-vous
- [Localisation](${base}/locations): carte et directions — ${site.contact.landmark}
- [Ongles près de chez vous](${base}${nearMeRoute}): notre salon dans votre quartier

## Comparaisons (FR)
- [Pose vs remplissage](${base}/comparaisons/pose-vs-remplissage)
- [Manucure vs pédicure](${base}/comparaisons/manucure-vs-pedicure)
- [Gel vs acrylique](${base}/comparaisons/gel-vs-acrylique)
- [Meilleur service pour vous](${base}/comparaisons/meilleur-pour)

## English Equivalents
- [Services](${enBase}/services)
- [Pricing](${enBase}/pricing)
- [FAQ](${enBase}/faq)
- [Contact](${enBase}/contact)
- [Book online](${enBase}/book-online)
- [Nail salon near you](${enBase}${nearMeRoute})
- [Nail extensions vs fill](${enBase}/comparisons/nail-extensions-vs-fill)
- [Manicure vs pedicure](${enBase}/comparisons/manicure-vs-pedicure)
- [Gel vs acrylic](${enBase}/comparisons/gel-vs-acrylic)
- [Best nail service for you](${enBase}/comparisons/best-for)
`
```

**Word count target:** `site.llmsDescription` must be ≥200 words for non-template tenants OR the combination of description + generated facts must exceed 200 unique words. The build guard (`checkLlmsDepth`) should verify the full rendered body contains ≥200 words (use existing `countWords()` function from `schema-invariants.ts`).

### Pattern 6: Config Field Additions

**`TenantSite` additions** (`src/config/types.ts`):
```typescript
export type TenantSite = {
  // ... existing fields ...
  /** GA4 measurement ID (e.g. "G-XXXXXXXXXX"). Empty string = no analytics for this tenant. */
  ga4MeasurementId: string
  /** Hand-authored per-tenant llms.txt intro paragraph. Must be ≥200 unique words per tenant.
   *  No hardcoded city/landmark strings from OTHER tenants. */
  llmsDescription: string
}
```

Both fields are required (non-optional) in `TenantSite`. A missing or empty `llmsDescription` is caught by `checkLlmsDepth()`. A missing or empty `ga4MeasurementId` is flagged by `checkGA4IdPresent()` — but unlike schema violations, a missing GA4 ID should be a WARNING (build proceeds) not a hard failure. Document this choice explicitly.

**Per-tenant site.ts population** (example for ongles-maily):
```typescript
// src/config/tenants/ongles-maily/site.ts
export const site = {
  // ... existing fields ...
  ga4MeasurementId: "G-XXXXXXXXXX",  // populated by owner
  llmsDescription: "Ongles Maily est un salon d'ongles professionnel situé à Carrefour Beauport...",
} as const
```

### Pattern 7: Schema Invariants Extensions

New check functions to add to `schema-invariants.ts`. All follow the existing `SchemaInvariantError[]` return pattern. **Critical constraint:** schema-invariants.ts is imported by `next.config.ts` via the SWC require-hook — must be alias-free static imports, no `process.env`, no network calls, no side effects.

```typescript
// checkLlmsDepth: llmsDescription present + word count >= 200 words per tenant
export function checkLlmsDepth(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = []
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue
    if (!cfg.site.llmsDescription || countWords(cfg.site.llmsDescription) < 200) {
      errors.push(err(id, 'LLMS-02', `site.llmsDescription missing or < 200 words (${countWords(cfg.site.llmsDescription ?? '')} found)`))
    }
  }
  return errors
}

// checkLlmsLeak: tenant X's llmsDescription must not contain other tenant's city/landmark
export function checkLlmsLeak(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = []
  // Build map of per-tenant city/landmark strings to check against
  const tenantSignals: Record<string, string[]> = {}
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue
    tenantSignals[id] = [
      cfg.site.contact.address.city,
      cfg.site.contact.landmark,
    ].filter(Boolean)
  }
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue
    const desc = cfg.site.llmsDescription ?? ''
    for (const [otherId, signals] of Object.entries(tenantSignals)) {
      if (otherId === id) continue
      for (const signal of signals) {
        if (desc.toLowerCase().includes(signal.toLowerCase())) {
          errors.push(err(id, 'LLMS-01', `llmsDescription contains "${signal}" from tenant ${otherId} — cross-tenant leak`))
        }
      }
    }
  }
  return errors
}

// checkGA4IdPresent: ga4MeasurementId non-empty (warning-level, not hard-fail)
export function checkGA4IdPresent(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = []
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue
    if (!cfg.site.ga4MeasurementId) {
      errors.push(err(id, 'MEAS-01', 'ga4MeasurementId missing — no GA4 analytics for this tenant'))
    }
  }
  return errors
}

// checkNapConsistency: name/phone/address/hours on site === location per tenant
// (location is the canonical NAP for JSON-LD; site is the rendered UI source)
export function checkNapConsistency(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = []
  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue
    const s = cfg.site.contact
    const l = cfg.location
    if (s.phone !== l.phone) errors.push(err(id, 'NAP-01', `phone mismatch: site="${s.phone}" vs location="${l.phone}"`))
    if (s.address.street !== l.address.street) errors.push(err(id, 'NAP-01', `address.street mismatch`))
    if (s.address.city !== l.address.city) errors.push(err(id, 'NAP-01', `address.city mismatch`))
    if (s.address.postalCode !== l.address.postalCode) errors.push(err(id, 'NAP-01', `address.postalCode mismatch`))
    // hours: site.hours (OpeningHoursSpecification) should match location.hoursSpec
    // Compare count of blocks as a proxy (exact times are per-tenant config)
    if (cfg.site.hours.length !== l.hoursSpec.length) {
      errors.push(err(id, 'NAP-01', `hours block count mismatch: site has ${cfg.site.hours.length}, location has ${l.hoursSpec.length}`))
    }
  }
  return errors
}
```

Add all four to `validateSchemaInvariants()`:
```typescript
errors.push(...checkLlmsDepth())
errors.push(...checkLlmsLeak())
errors.push(...checkGA4IdPresent())   // consider as warning only — see pitfall
errors.push(...checkNapConsistency())
```

### Pattern 8: Above-Fold Trust Signals (C-02/C-03)

The three C-02 signals and their per-page insertion points:

**Signal 1: Star rating + review count** — gated on R-02 (`site.reviews.reviewCount > 0`). Already rendered on the home page in the `#testimonials` section (below the fold). For above-fold placement, insert a compact version in the hero section using `site.reviews.ratingValue` and `site.reviews.reviewCount`. The R-02 guard in `src/lib/seo.ts` gates JSON-LD emission; for UI, the existing `site.reviews.reviewCount > 0` check is the R-02 equivalent for the home page.

**Signal 2: Years-experience badge** — "15+" value is in `config/base/content.*.json` under `hero.badges[0]` (value: "15+", label: "Years experience"). Already rendered in the home hero as `dict.hero.badges`. For service/pricing pages it must be added.

**Signal 3: Price-from anchor** — `formatFromPrice(lang, service.price, labels.priceFrom)` already in service detail pages (line 59, `/services/[slug]/page.tsx`). The rendered `priceDisplay` appears in the "What's included" section (below fold). For above-fold: add a `<a href={/${lang}/tarifs}>` price-from pill in the service hero or AnswerBlock area.

**Insertion points per page:**

| Page | Above-fold element | Stars insertion | Price-from insertion | Experience badge |
|------|-------------------|-----------------|----------------------|-----------------|
| Home (`page.tsx`) | Hero section (grid left column, after CTA buttons) | After CTA buttons if reviewCount > 0 | Min service price as "À partir de $30" link to /tarifs | Already in `dict.hero.badges` — ensure "15+" is present |
| Service detail (`/services/[slug]`) | Section after AnswerBlock (hero area) | Add stars+count after h2 if reviewCount > 0 | `priceDisplay` already rendered — add link to /tarifs | Add "15+ ans" badge in hero panel |
| Tarifs (`/tarifs`, `/pricing`) | AnswerBlock + PricingTable are already above fold | Add below AnswerBlock heading | Price table IS the price anchor — verify most-affordable price is prominent | Add "15+" badge below AnswerBlock |
| Comparison + near-me | AnswerBlock (already first-in-main) | Lighter: single star row after AnswerBlock if reviewCount > 0 | Add "from $30" link | Add "15+ years" text in AnswerBlock context or subheading |

### Pattern 9: NAP Consistency (N-01/N-02)

**NAP surfaces rendered on-site (all resolved from `getStoreConfig()`):**
1. `layout.tsx` → JSON-LD (organizationGraph / NailSalon) — uses `site.name`, `site.contact.*`
2. `Footer.tsx` — uses `site.name` (partial NAP)
3. `contact/page.tsx` — renders `site.contact.phone`, `site.contact.address.*`, `site.contact.landmark`
4. `llms.txt/route.ts` — renders `site.contact.address`, `site.contact.phone`, `site.contact.landmark`
5. `LocationsSection.tsx` / `SalonCard.tsx` — uses `location.phone`, `location.address.*`, `location.hours`
6. `lib/seo.ts` (JSON-LD builders) — uses `locations[0].phone`, `locations[0].address.*`, `locations[0].hoursSpec`
7. `near-me pages` (beauport/charlesbourg/trois-rivieres) — via `NearMeDetails` component + breadcrumb

The structural guarantee is that all surfaces call `getStoreConfig()` which resolves from the same static config. The `checkNapConsistency()` guard (Pattern 7) asserts that `site.contact` matches `location` (the two internal NAP objects). This closes the identity gap.

**N-02 NAP Reference artifact format:** A generated `docs/nap-reference.md` file built from TENANT_REGISTRY during the planning/verification phase (or written manually by referencing `schema-invariants.ts` output). Content:

```markdown
# NAP Reference — ongles-website (per-tenant, for external GBP/directory alignment)

## Ongles Maily
- **Name:** Ongles Maily
- **Address:** 3333 Rue du Carrefour, Québec, QC G1C 5R9
- **Phone:** (418) 660-8228
- **Landmark:** Carrefour Beauport — Entrées 4 ou 5
- **Hours:** Mon–Wed 9:00–17:30; Thu–Fri 9:00–21:00; Sat 9:00–17:00; Sun 10:00–17:00

## Ongles Charlesbourg
...
```

This artifact is produced once per verification phase; it is NOT auto-generated on every build (avoid adding build complexity). Instead, a verification task produces it by reading TENANT_REGISTRY.

### Anti-Patterns to Avoid

- **GA4 in `<head>` via raw HTML `<script>` tags:** Use `next/script` only; raw scripts bypass Next.js deduplication and hydration. [CITED: node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md]
- **`onLoad`/`onReady` in Server Components:** These props are Client-Component-only; using them in `layout.tsx` (Server Component) causes a runtime error. [VERIFIED: script.md — "onLoad does not yet work with Server Components"]
- **`next/third-parties` GoogleAnalytics helper:** This export does not exist in Next.js 16.2.6; the module will throw `Cannot find module`. [VERIFIED: package.json exports map has no `./third-parties` entry]
- **Loading GA4 without Consent Mode v2 init:** gtag.js must not load before the `gtag('consent','default',{denied})` call; the `beforeInteractive` inline script ensures this ordering. [ASSUMED — consistent with Google's Consent Mode v2 spec]
- **Hardcoding tenant strings in llms.txt:** The entire point of L-01 is to eliminate this; use `site.llmsDescription` and `getStoreConfig()` exclusively.
- **Adding `llmsDescription` to `SiteSectionSchema` (Supabase admin override surface):** Per the canonicalUrl exclusion pattern (I-01), `llmsDescription` should NOT be in the Supabase-overrideable surface to prevent remote content injection.
- **`web-vitals` external package install when Next.js already bundles it:** Adds lock-file complexity; use `import { useReportWebVitals } from 'next/web-vitals'` instead.
- **Importing `schema-invariants.ts` or `config-completeness.ts` from alias-requiring paths:** The build-guard SWC hook only resolves static `require()` chains; any `@/lib/*` import causes `MODULE_NOT_FOUND` in Docker. All new check functions must use relative imports only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Analytics loading strategy | Custom `<script>` injection | `next/script` `<Script>` | Handles deduplication, strategy-based defer, SSR injection |
| web-vitals CWV collection | Custom PerformanceObserver | `useReportWebVitals` from `next/web-vitals` | Already bundled; handles browser compat, INP attribution, navigation type |
| Sentence/word counting | New parser | Existing `countWords()` / `splitSentences()` in `schema-invariants.ts` | Already robust to Québec postal codes, French abbreviations, decimals |
| Price formatting | Inline formatting | Existing `formatFromPrice()` in `src/lib/format.ts` | Single source of truth for price display |
| Cross-tenant overlap detection | New grep/string match | Existing `measureSentenceOverlap()` in `schema-invariants.ts` | Already tested for 30% overlap threshold |
| Map link generation | Inline Google Maps URL | Existing `mapLink()` in `src/lib/locations.ts` | Handles encoding, consistent URL format |

**Key insight:** The existing `schema-invariants.ts` already contains the word-counting, sentence-splitting, and overlap-detection logic. New guards extend `validateSchemaInvariants()` rather than creating new files.

---

## Common Pitfalls

### Pitfall 1: Script `id` prop required for inline scripts in React 19
**What goes wrong:** Inline `<Script>` (with children, no `src`) without an `id` prop causes duplicate injection or hydration warnings in React 19 strict mode.
**Why it happens:** React deduplicates by `id`; without it, each re-render in dev may reinject.
**How to avoid:** Always set `id="gtag-consent-init"` and `id="gtag-config"` on inline Script blocks.
**Warning signs:** Console warning "Cannot have duplicate id" or double gtag init.

### Pitfall 2: Consent Mode update order
**What goes wrong:** `gtag('consent','update',...)` fires before `gtag.js` has loaded; consent signal is silently dropped.
**Why it happens:** The `ConsentBanner` `useEffect` runs on mount, which may be before `afterInteractive` gtag.js fires.
**How to avoid:** Check `window.gtag` exists before calling (`window.gtag?.(...)`); gtag.js sets up `window.dataLayer` via the inline init script so queued calls are replayed when the library loads. The `wait_for_update: 500` in `gtag('consent','default',...)` provides a 500ms buffer. [ASSUMED — standard Consent Mode v2 pattern]
**Warning signs:** GA4 DebugView shows events before consent update fires.

### Pitfall 3: FloatingCTA is an async Server Component
**What goes wrong:** Adding `onClick` handlers directly to `FloatingCTA.tsx` fails because it is not a Client Component.
**Why it happens:** `FloatingCTA` calls `await getStoreConfig()` — it is `async`, making it a Server Component even without `'use client'`.
**How to avoid:** Either (a) convert `FloatingCTA` to a Client Component and pass `site.contact.phoneHref` + booking path as props from `layout.tsx`, or (b) add a thin `FloatingCTAButtons` client wrapper that renders the `<a>` tags. Option (a) is simpler.
**Warning signs:** TypeScript error "async components are not supported in Client Components" or missing click events.

### Pitfall 4: schema-invariants.ts alias imports
**What goes wrong:** New check functions import from `@/lib/*` or `@/config/*` aliases; build fails with `MODULE_NOT_FOUND` in Docker.
**Why it happens:** The SWC require-hook in `next.config.ts` only resolves `.ts` imports if the entire transitive chain uses relative paths (no alias expansion).
**How to avoid:** All new check functions in `schema-invariants.ts` must use relative imports only; access TENANT_REGISTRY data directly (it's already imported at the top of the file).
**Warning signs:** `next build` in Docker fails with `Error: Cannot find module '@/...'` during the `assertSchemaInvariants()` call.

### Pitfall 5: llms.txt comparison slugs are tenant-specific
**What goes wrong:** The route hardcodes FR comparison slugs (`/comparaisons/pose-vs-remplissage`), which may not exist for all tenants.
**Why it happens:** Comparison slugs exist in COMPARISONS registry but the route handler doesn't check which tenant is serving.
**How to avoid:** Import `COMPARISONS` from `src/lib/comparisons.ts` and map them; all 4 exist for all tenants per current config. Document that if a tenant deactivates a comparison, the llms.txt guard must reflect it.
**Warning signs:** llms.txt links 404 on comparison pages.

### Pitfall 6: `site.url` vs `site.canonicalUrl` confusion
**What goes wrong:** Current `route.ts` line 10 uses `site.url` not `site.canonicalUrl`. For ongles-maily these are identical; for charlesbourg/rivieres `site.url` has `www.` prefix which may differ from the GA4 property's configured domain.
**Why it happens:** Developer used `site.url` (runtime URL, potentially overridden by Supabase) instead of `site.canonicalUrl` (stable, non-overrideable production origin).
**How to avoid:** Always use `site.canonicalUrl` in llms.txt (L-02). [VERIFIED: route.ts line 10 — `site.url` confirmed as the current (wrong) value]

### Pitfall 7: R-02 gate for above-fold star rating
**What goes wrong:** Stars component renders when `site.reviews.reviewCount > 0` — but `site.reviews` in `site.ts` is hardcoded `{ ratingValue: 0, reviewCount: 0 }` for all three tenants currently. The R-02 gate passes because count === 0; no stars show.
**Why it happens:** `google-reviews.json` has `fetchedAt: null` (stub); `site.reviews` in the static config are also stubs.
**How to avoid:** For C-02 above-fold trust, the "stars" signal is conditionally rendered only when `site.reviews.reviewCount > 0`. Since no tenant currently passes R-02, the CONV-02 implementation uses the years-experience badge and price-from anchor as the always-available signals. Stars slot is prepared but will show zero tenants initially — this is correct behavior, not a bug.
**Warning signs:** No stars ever showing despite the implementation — expected until real review data is fetched.

---

## Runtime State Inventory

Phase 5 is NOT a rename/refactor phase — no runtime state migration required. New fields (`ga4MeasurementId`, `llmsDescription`) are additive to the static config; no data migration needed. GA4 property creation and GA4 console channel-group configuration are manual admin steps, not code deliverables.

**Nothing found in category:** All 5 categories explicitly checked — no stored data, live service config, OS-registered state, secrets, or build artifacts require migration for this phase.

---

## Open Questions

1. **GA4 measurement IDs for all 3 tenants**
   - What we know: GA4 properties must be created per-tenant; IDs are in format `G-XXXXXXXXXX`.
   - What's unclear: The actual IDs for ongles-charlesbourg and ongles-rivieres — the owner must create GA4 properties and provide these.
   - Recommendation: Planner adds a `checkpoint:human-verify` task to collect GA4 IDs before the guard assertion task. The `ga4MeasurementId: ""` default makes the field optional at runtime (no script tag emitted when empty).

2. **`site.llmsDescription` content for all 3 tenants**
   - What we know: Must be hand-authored, ≥200 words, no cross-tenant leakage, bilingual-friendly.
   - What's unclear: The actual prose — the owner or a copywriter provides it.
   - Recommendation: Planner adds a `checkpoint:human-verify` task for llmsDescription content before the completeness guard task. Provide a template/prompt in the plan.

3. **`checkGA4IdPresent()` as hard-fail vs warning**
   - What we know: A missing GA4 ID means no analytics — legitimate for a tenant in transition.
   - What's unclear: Should a missing ID block the build (like schema violations) or just log a warning?
   - Recommendation: Treat as a WARNING in `validateSchemaInvariants()` (logged but build proceeds); the planner implements this by collecting these errors separately before throwing.

4. **ConsentBanner copy for all 3 tenants**
   - What we know: FR/EN strings go in `config/base/content.*.json`; a `consent` key is net-new.
   - What's unclear: Exact consent copy phrasing (regulatory-acceptable but friendly).
   - Recommendation: Use simple FR: "Ce site utilise des témoins d'analyse (Google Analytics) pour améliorer votre expérience. Acceptez-vous?" + [Accepter] [Refuser]. EN: "This site uses analytics cookies (Google Analytics) to improve your experience. Do you accept?" + [Accept] [Decline]. This is Québec Law 25 minimal compliant.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `next/script` | GA4 load (MEAS-01) | ✓ | Next.js 16.2.6 built-in | — |
| `next/web-vitals` | CWV reporting (MEAS-02) | ✓ | Next.js 16.2.6 built-in | External `web-vitals@5.3.0` |
| `bun` | lockfile management | ✓ | 1.x | — |
| GA4 Properties (3 tenants) | MEAS-01 | ✗ (not created) | — | Skip `ga4MeasurementId` field; no analytics emitted |
| `web-vitals@5.3.0` (external) | MEAS-02 (if attribution) | ✗ (not installed) | — | Use `next/web-vitals` built-in |

**Missing dependencies with no fallback:** None that block code implementation.

**Missing dependencies with fallback:** GA4 measurement IDs (owner-created) — code defaults to empty string (no script emitted); CWV via `next/web-vitals` built-in covers MEAS-02 without external package.

---

## Validation Architecture

nyquist_validation is ENABLED. Every requirement must have a specified automated signal.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test |
| Config file | `bunfig.toml` (inferred from project; `bun test` command works) |
| Quick run command | `bun test --testPathPattern="schema-invariants\|config-completeness"` |
| Full suite command | `bun test` (357 pass currently; 11 Playwright failures pre-exist and are not regressions) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LLMS-01 | `llmsDescription` present, no cross-tenant city/landmark in body | unit — `checkLlmsLeak()` | `bun test --testPathPattern="schema-invariants"` | ❌ Wave 0 — extend `schema-invariants.test.ts` |
| LLMS-02 | `llmsDescription` ≥200 words per tenant | unit — `checkLlmsDepth()` | `bun test --testPathPattern="schema-invariants"` | ❌ Wave 0 |
| LLMS-01/02 | llms.txt route returns per-tenant body with correct canonical URLs | unit (route) | `bun test --testPathPattern="llms.txt"` | ❌ Wave 0 — new `src/app/llms.txt/route.test.ts` |
| LOCAL-01 | `site.contact` phone/address/postalCode === `location.phone/address.*` | unit — `checkNapConsistency()` | `bun test --testPathPattern="schema-invariants"` | ❌ Wave 0 |
| CONV-01 | FloatingCTA renders with book + phone links (mobile visibility) | e2e — manual (DevTools mobile emulation) | `npx playwright test --grep "FloatingCTA"` | ❌ Wave 0 (or manual UAT) |
| CONV-01 | book_online_click event fires on FloatingCTA book link click | unit/integration — mock gtag | `bun test --testPathPattern="FloatingCTA"` | ❌ Wave 0 |
| CONV-02 | Trust signals (Stars, price-from) render above fold on home page | e2e / visual — manual UAT | DevTools → scroll to 0 + check element visibility | manual-only (above-fold = layout concern) |
| CONV-02 | R-02 gate: Stars only shown when reviewCount > 0 | unit | existing home page test pattern | ✅ covered by existing R-02 tests in schema-invariants.test.ts (schema side); UI side needs ❌ Wave 0 |
| MEAS-01 | GA4 Script tags present in layout HTML when ga4MeasurementId non-empty | unit (layout render) | `bun test --testPathPattern="layout"` | ❌ Wave 0 — new `src/app/[lang]/layout.test.tsx` |
| MEAS-01 | gtagEvent() emits correct event names + param shapes | unit | `bun test --testPathPattern="gtag"` | ❌ Wave 0 — `src/lib/gtag.test.ts` |
| MEAS-01 | GA4 DebugView shows events on accept | manual — DevTools Network + GA4 DebugView | manual UAT step | manual-only |
| MEAS-02 | WebVitalsReporter calls gtag with INP/LCP/CLS when metric fires | unit (mock useReportWebVitals) | `bun test --testPathPattern="WebVitalsReporter"` | ❌ Wave 0 |
| MEAS-02 | INP P75 visible in GA4 | manual — DevTools Network tab + GA4 events | manual UAT step | manual-only |
| MEAS-01/02 | `ga4MeasurementId` field present in TenantSite type | type-check | `bunx tsc --noEmit` | ❌ Wave 0 (after types.ts edit) |

### Sampling Rate

- **Per task commit:** `bun test --testPathPattern="schema-invariants|config-completeness|gtag|llms"` (unit tests only, ~5s)
- **Per wave merge:** `bun test` (full suite, ~550ms)
- **Phase gate:** Full suite green + manual UAT (GA4 DebugView, DevTools Network, mobile CTA visibility) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/app/llms.txt/route.test.ts` — covers LLMS-01/02: per-tenant body, no hardcoded city strings, canonicalUrl used, ≥200 words
- [ ] `src/lib/gtag.test.ts` — covers MEAS-01: gtagEvent() names, param shapes, consent init/update calls
- [ ] `src/components/WebVitalsReporter.test.tsx` — covers MEAS-02: mocked useReportWebVitals → gtag event emission
- [ ] `src/config/schema-invariants.test.ts` — EXTEND existing file: add tests for `checkLlmsDepth`, `checkLlmsLeak`, `checkGA4IdPresent`, `checkNapConsistency`
- [ ] `src/app/[lang]/layout.test.tsx` — covers MEAS-01: Script tags present when ga4MeasurementId non-empty

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not applicable (no new auth) |
| V3 Session Management | no | Not applicable |
| V4 Access Control | no | GA4 and web-vitals are client-only; no new admin routes |
| V5 Input Validation | yes (partial) | `llmsDescription` is static config, not user input; no validation needed at runtime. ConsentBanner reads/writes `localStorage` (no XSS vector from storage reads). |
| V6 Cryptography | no | No new crypto operations |
| V7 Error Handling | yes | `window.gtag?.()` optional chaining prevents undefined-call errors; `try/catch` already in PopupHost localStorage pattern — mirror it in ConsentBanner |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Third-party script supply chain (gtag.js) | Tampering | CSP `script-src` allowlist `googletagmanager.com` when CSP is eventually added (noted in next.config.ts); use `strategy="afterInteractive"` not `beforeInteractive` for GA4 to reduce attack surface |
| `llmsDescription` content injection | Tampering | Field is static in TypeScript config, not user-editable via Supabase; exclude from `SiteSectionSchema` (same as `canonicalUrl`) |
| localStorage XSS via consent value | Tampering | `localStorage.getItem(CONSENT_KEY)` is only ever compared to `'accepted'`/'`declined'` strings; no eval or innerHTML injection possible |
| GA4 data exfiltration (user behavioral data sent to Google) | Information Disclosure | Consent Mode v2 denied-by-default; `analytics_storage:'denied'` means only cookieless pings sent pre-consent per Google's spec [ASSUMED — per Google Consent Mode v2 docs] |
| CSP violation from `googletagmanager.com` scripts | Information Disclosure | No CSP currently deployed (next.config.ts note); when added, allowlist `*.googletagmanager.com` in `script-src` and `connect-src` |

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Next.js 16.2.6 is non-standard:** `next/third-parties` absent — confirmed. Read `node_modules/next/dist/docs/` before any `<Script>` or layout change. [VERIFIED]
- **Multi-tenant, `force-dynamic`:** All tenant data via `getStoreConfig()`. Never hardcode tenant strings.
- **Locale parity:** `content.en.json` and `content.fr.json` MUST have identical key structure. New `consent` key must be added to both files simultaneously.
- **JSON-LD stays in `src/lib/seo.ts`:** No inline schema in page.tsx. (Not applicable to this phase — no new JSON-LD.)
- **Approved dep:** `web-vitals@5.3.0` — approved but redundant (use `next/web-vitals` built-in). Install only if attribution mode needed.
- **Rejected deps:** `@vercel/speed-insights`, `next-seo` — do not add.
- **Dual-lockfile trap:** Both `bun.lock` + `package-lock.json` committed; Dokploy uses `bun --frozen-lockfile`. Run `bun install` after ANY dep change.
- **`schema-invariants.ts` alias-free constraint:** All new guard functions must use relative imports only. No `@/lib/*` in schema-invariants.ts.
- **`next.config.ts` is the build guard:** New schema-invariants checks are wired there via `assertSchemaInvariants()`.
- **Runtime dict keys in `config/base/content.*.json`:** Consent banner strings go there, NOT in `src/dictionaries/*.json`.
- **Immutability:** Never mutate existing config objects; new fields added to `TenantSite` type, all new objects are return-new-copy.
- **Files ≤800 lines, functions ≤50 lines:** `schema-invariants.ts` is already large; new check functions should be small (each ≤30 lines).

---

## Code Examples

### GA4 + Consent Mode v2 Init Order (from Next.js script.md + Google spec)

```tsx
// layout.tsx — correct ordering (Server Component)
// Source: node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md

import Script from 'next/script'

// 1. Consent default MUST come before gtag.js loads
<Script id="gtag-consent-init" strategy="beforeInteractive">{`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent','default',{
    ad_storage:'denied',
    analytics_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied',
    wait_for_update:500
  });
`}</Script>

// 2. Load gtag.js AFTER consent default is set
<Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX" />
<Script id="gtag-config" strategy="afterInteractive">{`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX');
`}</Script>
```

### useReportWebVitals → gtag (from Next.js docs)

```tsx
// Source: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-report-web-vitals.md
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals(metric => {
    window.gtag?.('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  })
  return null
}
```

### Conversion event (click handler in Client Component)

```tsx
// FloatingCTA — after converting to Client Component
'use client'
import { ga4Events } from '@/lib/gtag'

export function FloatingCTA({ phoneHref, bookHref, bookLabel, callLabel, location }) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      <a
        href={bookHref}
        onClick={() => ga4Events.bookOnlineClick(location)}
        className="..."
      >{bookLabel}</a>
      <a
        href={phoneHref}
        onClick={() => ga4Events.callClick(phoneHref)}
        className="..."
      >...</a>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/third-parties` GoogleAnalytics | Hand-rolled `next/script` with gtag.js | N/A — never applicable to Next.js 16.2.6 | Must use Script directly in layout.tsx |
| `web-vitals` external package (onINP standalone) | `useReportWebVitals` from `next/web-vitals` (bundles INP) | Next.js 16+ bundled web-vitals | No external package needed for core CWV reporting |
| GA4 Direct Acquisition misattribution for AI traffic | Native GA4 AI-Assistant channel (June 2026) | GA4 June 2026 update | AI-referrer traffic auto-categorized; Perplexity still needs custom regex channel (admin console step) |
| Consent Mode v1 | Consent Mode v2 (required by Google 2024) | March 2024 | Must use v2 params: `ad_user_data`, `ad_personalization` |

**Deprecated/outdated:**
- `next/third-parties`: Never existed in 16.x; exists only in 14.x+ of the public Next.js release — this project's private fork does not include it.
- `onFID` web vital: Deprecated (replaced by INP); still included in `useReportWebVitals` for backward compat but INP is the primary interaction metric.
- `FID` (First Input Delay): Replaced by INP as Core Web Vital. `next/web-vitals` still fires `onFID` for compatibility.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `wait_for_update: 500` is sufficient for Consent Mode v2 before gtag.js fires | Pattern 1, Pitfall 2 | Consent default may not apply before first gtag events fire; increase to 1000 or use `gtag('consent','default')` with `update_timer` workaround |
| A2 | `window.gtag?.()` optional chaining queues calls in `dataLayer` before gtag.js loads | Pattern 2 | Calls before library load are silently dropped; verify in DebugView |
| A3 | `localStorage` (not cookies) is acceptable for consent persistence under Québec Law 25 | Pattern 2 | If server-side consent reading is ever needed (SSR personalization), switch to secure cookie |
| A4 | Comparison routes are consistent across all three tenants in this phase | Pattern 5 | llms.txt links comparison pages that don't exist for a tenant; add per-tenant route check |
| A5 | `site.routes.at(-1)` reliably returns the near-me slug | Pattern 5 | If `site.routes` ordering changes, wrong route linked; use explicit `nearMeSlug` field or filter by borough-specific heuristic |
| A6 | GA4 AI-Assistant native channel (June 2026) captures Perplexity | State of the Art | Perplexity may still be miscategorized; manual custom channel regex step is UAT-required |
| A7 | Inline `<Script>` children (not src) require `id` prop in React 19 to avoid duplication | Pitfall 1 | Without `id`, may cause duplicate script injection in dev/strict mode |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md` — `<Script>` strategies, Server Component constraints, `onLoad` restriction [VERIFIED]
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-report-web-vitals.md` — `useReportWebVitals` API, metric object shape, gtag integration example [VERIFIED]
- `node_modules/next/dist/client/web-vitals.js` — confirmed `onINP`, `onCLS`, `onLCP`, `onFID`, `onFCP`, `onTTFB` bundled [VERIFIED]
- `node_modules/next/package.json` — confirmed `next/third-parties` export absent [VERIFIED]
- `src/app/llms.txt/route.ts` — exact leak lines identified (10, 15, 25) [VERIFIED]
- `src/config/types.ts` — current `TenantSite` type, field additions planned [VERIFIED]
- `src/config/schema-invariants.ts` — existing guard pattern, exports, `validateSchemaInvariants()` composition [VERIFIED]
- `src/config/tenants/ongles-{maily,charlesbourg,rivieres}/site.ts` — confirmed landmark strings, NAP data [VERIFIED]
- `src/app/[lang]/layout.tsx` — FloatingCTA mount, Server Component structure [VERIFIED]
- `src/components/FloatingCTA.tsx` — async Server Component (requires conversion for click events) [VERIFIED]
- `src/components/ContactForm.tsx` — existing Client Component, `handleSubmit` success path [VERIFIED]
- `src/components/PopupHost.tsx` — localStorage persistence pattern (model for ConsentBanner) [VERIFIED]
- `src/app/[lang]/page.tsx` — hero badges, Stars placement, review gate at `reviewCount > 0` [VERIFIED]
- `src/config/base/content.*.json` — confirmed runtime UI dict location for consent banner strings [VERIFIED]
- `src/lib/comparisons.ts` — all 4 comparison slugs (FR+EN) for llms.txt links [VERIFIED]

### Secondary (MEDIUM confidence)
- `.planning/phases/05-llms-txt-depth-measurement/05-CONTEXT.md` — locked decisions, discretion areas [CITED: project planning file]
- `.planning/STATE.md` — approved/rejected packages, architecture constraints [CITED: project state file]

### Tertiary (LOW confidence — ASSUMED)
- Google Consent Mode v2 init order (`beforeInteractive` before `afterInteractive`) [ASSUMED — standard Google spec, not verified via web search this session]
- Québec Law 25 compliance via Consent Mode v2 denied-by-default [ASSUMED — legal requirement stated in CONTEXT.md decisions]
- GA4 native AI-Assistant channel capturing AI traffic (June 2026) [ASSUMED — stated in CONTEXT.md; not verified via web search this session]

---

## Metadata

**Confidence breakdown:**
- Standard stack (next/script, next/web-vitals): HIGH — verified in node_modules
- GA4 Consent Mode v2 pattern: MEDIUM/HIGH — Next.js Script docs verified; consent init order is ASSUMED (standard Google spec)
- Architecture (guard pattern extension): HIGH — verified in schema-invariants.ts
- Pitfalls: HIGH — most verified directly in codebase; A-series items are ASSUMED

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 (stable — Next.js 16.2.6 is pinned; web-vitals API is stable)
