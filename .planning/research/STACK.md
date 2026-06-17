# Stack Research

**Domain:** SEO + GEO (AI-citation) tooling for multi-tenant Next.js App Router
**Researched:** 2026-06-17
**Confidence:** HIGH

---

## Context: What Is Already in the Repo

The following are **not** to-add items — they already exist and are working:

| Already Exists | Notes |
|----------------|-------|
| `generateMetadata` per-locale per-page | App Router native, correct approach |
| JSON-LD via `<script type="application/ld+json">` in RSC | Correct delivery method |
| `robots.ts` | Already generated |
| `sitemap.ts` | Already generated |
| `llms.txt` | Already present |
| `manifest.ts` | Already present |
| GA4 via gtag (assumed from project context) | Measurement platform in place |
| Google Business Profile reviews (build-time fetch) | Already wired |

Everything below is what to **add** on top of this foundation.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `schema-dts` | 2.0.0 | TypeScript types for all Schema.org JSON-LD objects | Google-maintained; gives compile-time checking of `@type`, required properties, and valid field names. Catches `openingHours` vs `openingHoursSpecification` mistakes before they reach the validator. Zero runtime cost — dev dependency only. |
| `web-vitals` | 5.3.0 | RUM measurement of INP, LCP, CLS, FCP, TTFB via `onINP`/`onLCP`/`onCLS` | INP replaced FID in 2024 and **cannot be measured in Lighthouse**. Only field data from real users tells you true P75 INP. The library is what Next.js itself uses internally. Use with `useReportWebVitals` in App Router. |
| GA4 Custom Channel Group (config, not library) | — | AI-referrer attribution segment | GA4's native "AI Assistant" channel (May 2026) covers ChatGPT/Gemini/Claude/DeepSeek/Copilot/Grok but **excludes Perplexity** and strips 35–70% of sessions that arrive without referrer headers. A custom channel group with regex is required to fill the gap. No new library needed — this is a GA4 admin configuration. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | 2.0.0 | Dev-time TypeScript types for JSON-LD (dev dep only) | Add to `devDependencies`. Use types like `NailSalon`, `FAQPage`, `BreadcrumbList`, `Service`, `AggregateRating`, `Review` to author JSON-LD objects. Install: `bun add -D schema-dts`. |
| `web-vitals` | 5.3.0 | RUM metric collection | Add to `dependencies` (runs in browser). Wrap in a `'use client'` component placed in root layout. Send via `navigator.sendBeacon()` to a `/api/vitals` route or directly to GA4's Measurement Protocol. |

### Development / Validation Tools (no npm install — external)

| Tool | Purpose | Notes |
|------|---------|-------|
| Google Rich Results Test (https://search.google.com/test/rich-results) | Validate JSON-LD against Google's ~30 supported rich result types | Manual per-URL check. No public API exists — the Structured Data Testing Tool API was deprecated and never replaced. Run after any schema change. |
| Schema.org Markup Validator (https://validator.schema.org) | Validate JSON-LD against the full Schema.org vocabulary (~800 types) | Complements the Rich Results Test. Catches structural errors the Google tool misses because Google only checks its own subset. |
| Google Search Console → Enhancements tab | Monitor rich result impressions, errors, and warnings at scale | Lags 28 days but shows real indexing status. Use to verify schema is being picked up after deploy. |
| PageSpeed Insights (https://pagespeed.web.dev) | Lab CWV data + Lighthouse | Use during development for LCP/CLS debugging. Do NOT use to measure INP — it can't. |
| Chrome DevTools Performance panel | Profile INP regressions | When `web-vitals` field data surfaces a high INP, use the Performance panel to find the blocking long task. |

---

## Schema Type Decisions

### LocalBusiness: Use `NailSalon` not `LocalBusiness`

Schema.org defines `NailSalon` as a direct subtype under the hierarchy:
`LocalBusiness → HealthAndBeautyBusiness → NailSalon`

Use `NailSalon` (or `BeautySalon` for salons that do more than nails). Using the most-specific type gives search engines and AI engines more disambiguation context and reduces entity confusion. The `schema-dts` package exports `NailSalonLeaf` for TypeScript typing.

### Schema types needed per page type

| Page | Schema Types |
|------|-------------|
| Homepage / Location | `NailSalon` with `name`, `address` (full `PostalAddress`), `telephone`, `geo` (`GeoCoordinates`), `openingHoursSpecification`, `priceRange`, `url`, `image`, `sameAs` (GBP/social links), `aggregateRating` |
| Service page | `Service` with `name`, `description`, `offers` (`Offer` with `price`, `priceCurrency`) nested inside `NailSalon` via `hasOfferCatalog` or `makesOffer` |
| FAQ page / blocks | `FAQPage` with `mainEntity` array of `Question`/`Answer` — only when Q&A content is **visible on the page** |
| Reviews page | `AggregateRating` + `Review` items — use real Google Business Profile data (already wired) |
| Breadcrumb nav | `BreadcrumbList` on all interior pages |
| About / Trust page | `Organization` with `founder`, `foundingDate`, `description` for entity authority |

**NAP consistency rule:** `name`, `streetAddress`, `addressLocality`, `telephone` in JSON-LD MUST be byte-for-byte identical to the Google Business Profile listing. Divergence creates competing entities in the Knowledge Graph.

### `@id` for entity stability

Assign a stable `@id` to the NailSalon entity (e.g., `https://example.com/#salon`). Reuse this `@id` across all pages that reference the same business. This is how Google and LLMs disambiguate between pages about the same entity and avoids accidentally creating duplicate competing entities across the multi-tenant setup.

---

## AI-Crawler robots.txt Strategy

### Recommended stance for a local business GEO play

Allow retrieval/search crawlers (drives AI citations). Optionally block training crawlers (protects content from being absorbed into model weights without attribution). Blocking training crawlers does NOT affect search ranking or AI citation frequency.

```
# Allow AI search/retrieval crawlers — these drive citations
User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-User
Allow: /

# Training crawlers — allow (default for local biz; citations require indexing)
# To opt out of training without losing citation visibility, disallow these:
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

# Opt out of Google's generative AI training (does NOT affect Search ranking)
User-agent: Google-Extended
Disallow: /

# Block low-quality scrapers
User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /
```

### Complete AI crawler user-agent reference (mid-2026)

| Provider | Crawler | Purpose | robots.txt Token |
|----------|---------|---------|-----------------|
| OpenAI | GPTBot | Training corpus | `GPTBot` |
| OpenAI | OAI-SearchBot | ChatGPT Search index | `OAI-SearchBot` |
| OpenAI | ChatGPT-User | On-demand fetch (user browsing) | `ChatGPT-User` |
| Anthropic | ClaudeBot | Training corpus | `ClaudeBot` |
| Anthropic | Claude-SearchBot | Claude search retrieval | `Claude-SearchBot` |
| Anthropic | Claude-User | On-demand fetch | `Claude-User` |
| Perplexity | PerplexityBot | Perplexity answer index | `PerplexityBot` |
| Perplexity | Perplexity-User | On-demand fetch (may ignore robots.txt for user-provided URLs) | `Perplexity-User` |
| Google | Googlebot | Traditional search index | `Googlebot` |
| Google | Google-Extended | Gemini/generative AI training | `Google-Extended` |
| Common Crawl | CCBot | Open training corpus | `CCBot` |
| ByteDance | Bytespider | TikTok/low-quality scraper | `Bytespider` |

**Critical rule:** Each Anthropic bot needs its own separate directive. Allowing `ClaudeBot` does not affect `Claude-SearchBot` or `Claude-User`. List all three independently.

**Perplexity caveat:** Cloudflare published independent evidence (August 2025) documenting that Perplexity uses undeclared crawlers that circumvent robots.txt. For truly sensitive content, robots.txt is not sufficient — use access controls.

**Verify bots by IP:** User-agent strings can be spoofed. For high-confidence verification, compare visitor IPs against published JSON IP ranges (OpenAI: `openai.com/gptbot.json`, Google: published in GSC docs, Perplexity: published on perplexity.ai/perplexitybot). Anthropic does not publish IP ranges; use reverse DNS as fallback.

---

## GA4 AI-Referrer Attribution Setup

**No new npm packages required.** This is a GA4 admin configuration task.

### Step 1: Verify native AI Assistant channel (May 2026)

GA4 auto-assigns `medium=ai-assistant` for recognized sources. As of June 2026, the native default channel group covers: ChatGPT, Gemini, DeepSeek, Copilot, Grok. **Perplexity is absent** from the official list.

### Step 2: Create a custom channel group

In GA4 Admin → Data Display → Channel Groups → New Channel Group:
- Channel name: `AI Traffic`
- Condition: Source **matches regex** (case-insensitive)
- Regex pattern (update quarterly):

```
chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|anthropic\.com|gemini\.google\.com|bard\.google\.com|copilot\.microsoft\.com|bing\.com/chat|deepseek\.com|grok\.com|grok\.x\.ai|meta\.ai|you\.com|poe\.com|phind\.com|pi\.ai|character\.ai|mistral\.ai|cohere\.ai|huggingface\.co|exa\.ai
```

**Critical:** Drag the `AI Traffic` channel **above** the `Referral` channel in the list. GA4 evaluates rules top-down; if Referral fires first, AI traffic is miscategorized regardless of the regex.

### Step 3: Accept the Direct traffic gap

Between 35–70% of AI-referred sessions arrive without a referrer header and land in Direct. There is no technical fix for this — it is inherent to how native AI apps strip referrers. Track trends, not absolute counts. Treat Direct as a floor estimate.

### What to measure

| Metric | Purpose |
|--------|---------|
| Sessions from AI Traffic channel | Volume trend by engine |
| Conversion rate from AI Traffic vs Organic | AI referrals convert at 10–16% vs ~2% organic |
| Landing pages receiving AI traffic | Which pages get cited |
| Booking CTA clicks from AI-sourced sessions | Revenue attribution |

---

## llms.txt: Current State and Stance

**Status:** Community convention, not a ratified standard (no W3C/IETF backing as of mid-2026). No major AI provider has publicly confirmed reading it in production for search/citation. Google's John Mueller compared it to the deprecated `keywords` meta tag. A 300,000-domain study (SERanking, Nov 2025) found no statistically significant correlation between having `llms.txt` and AI citation frequency.

**The repo already has `llms.txt`.** The work here is **deepening its content**, not creating the file.

### What makes an effective `llms.txt` (mid-2026 consensus)

- Under 5 KB total
- Lead with a one-paragraph authoritative brand summary in a blockquote
- Organize sections by content function (not sitemap dump — that defeats the purpose)
- Include contact info (licensing / press)
- Maximum ~20–30 curated URLs — not a sitemap clone
- Must not contradict `robots.txt`

**The measurable value of `llms.txt` in 2026:** Developer tooling (Cursor, Copilot, Claude Code). If developers look up your API or service documentation, `llms.txt` helps AI coding assistants retrieve the right pages. For a nail salon, this value is near-zero. The primary value is **brand governance** — a canonical description reduces AI hallucinations about the salon's name/location/services.

---

## Core Web Vitals: INP Measurement

### Why INP requires RUM (not Lighthouse)

INP replaced FID as a Core Web Vital. Lighthouse **cannot measure INP** — it uses Total Blocking Time (TBT) as a proxy, which is not the same metric. The only valid INP data comes from real user interactions in the field.

### Implementation: `useReportWebVitals` + `web-vitals`

Next.js 16 App Router ships with `web-vitals` bundled internally. The canonical implementation:

```typescript
// src/components/WebVitalsReporter.tsx
'use client'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to GA4 via gtag
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
    // Or beacon to internal endpoint
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric))
  })
  return null
}
```

Place in root layout (not per-page layout — one instance per session).

### Thresholds (2026)

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| INP | ≤ 200ms | 200–500ms | > 500ms |
| LCP | ≤ 2.5s | 2.5–4s | > 4s |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |

### INP risk factors for this stack

- Framer Motion 12 animations triggered on scroll/interaction → potential INP contribution
- SalonX widget script injection (imperative `document.createElement`) → can block main thread on low-end mobile
- Iron-session cookie check on admin routes → server-side only, no INP impact

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-seo` | Designed for the Pages Router's `next/head` client component. In App Router it ships unnecessary JavaScript and creates a race condition where Googlebot may index a page before the correct title/description is injected. As of Next.js 14+, `generateMetadata` is the correct approach and is already in use in this repo. | Native `generateMetadata` (already in repo) |
| `react-schemaorg` | Wrapper around `schema-dts` that adds a React component layer. Useful only if you need component-level JSON-LD injection, which is unnecessary when you control layout files and can inject `<script>` tags in RSC. Adds a runtime dependency for no benefit in this architecture. | Inline `<script type="application/ld+json">` in RSC with `schema-dts` for typing (dev-only) |
| Lighthouse for INP measurement | Cannot measure INP — uses TBT as a proxy which is a different metric. A Lighthouse score of 100 does not mean INP is good for real users. | `web-vitals` RUM via `useReportWebVitals` |
| `@vercel/speed-insights` | Only works on Vercel deployments. This repo deploys to Dokploy on a VPS — the package will either do nothing or fail silently. Dashboards are basic and lock you to Vercel. | `web-vitals` + GA4 Measurement Protocol or a lightweight `/api/vitals` beacon endpoint |
| `keywords` meta tag | Dead since ~2009, still occasionally proposed. No search engine uses it. | Title + description via `generateMetadata` |
| Generic `LocalBusiness` schema type | Less specific than `NailSalon`; less context for Knowledge Graph disambiguation | `NailSalon` (schema.org, supported by `schema-dts`) |
| Microdata / RDFa for JSON-LD delivery | Google recommends JSON-LD. Microdata and RDFa are harder to maintain, mixed into HTML, and riskier to get wrong during refactors. | JSON-LD in `<script>` tag in RSC (already the approach in this repo) |

---

## Installation

```bash
# Dev dependency — type safety for JSON-LD authoring (zero runtime cost)
bun add -D schema-dts

# Runtime — RUM metric collection for INP/LCP/CLS
bun add web-vitals
```

No other new packages are needed. All other tooling (GA4, Rich Results Test, Search Console) is external configuration, not npm packages.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `schema-dts` (dev dep) for JSON-LD typing | No typing / manual JSON | Without types, `NailSalon` vs `BeautySalon` vs `LocalBusiness` errors, missing required fields, and typos (e.g., `openingHour` instead of `openingHoursSpecification`) only appear at validator time, not at build time. Schema-dts costs zero at runtime. |
| `web-vitals` for INP RUM | Google Search Console CWV report | GSC lags 28 days, requires minimum traffic thresholds, and gives no page-level breakdowns or debugging hooks. Use GSC as confirmation, not as primary measurement. |
| Native GA4 AI Assistant channel + custom regex | Third-party AI analytics tools (e.g., Ahrefs AI monitor) | Added vendor dependency and cost. GA4 is already in place; this is configuration, not infrastructure. |
| `NailSalon` schema type | Generic `LocalBusiness` | `NailSalon` is a direct schema.org type in the `HealthAndBeautyBusiness` hierarchy and gives the most specific entity signal. It is in `schema-dts` 2.0.0 as `NailSalonLeaf`. |
| JSON-LD in RSC `<script>` tag | `react-schemaorg` component | `react-schemaorg` adds React client-side overhead for a task (injecting a static JSON blob) that is purely server-side in App Router. The `<script>` approach in RSC is zero-JS. |

---

## Version Compatibility

| Package | Next.js | React | Notes |
|---------|---------|-------|-------|
| `schema-dts@2.0.0` | Any (dev dep, no runtime) | Any | Pure TypeScript types; no peer dependency on framework |
| `web-vitals@5.3.0` | Next.js 13+ App Router | React 18+ | Works with `useReportWebVitals` from `next/web-vitals`; Next.js bundles web-vitals internally so avoid importing both the npm package and Next.js's internal copy in the same component — use `useReportWebVitals` from `next/web-vitals` which delegates to the bundled version |

---

## Sources

- [NPM: schema-dts](https://www.npmjs.com/package/schema-dts) — version 2.0.0 confirmed via `npm show`; confidence HIGH
- [NPM: web-vitals](https://www.npmjs.com/package/web-vitals) — version 5.3.0 confirmed via `npm show`; confidence HIGH
- [schema.org/NailSalon](https://schema.org/NailSalon) — type confirmed in schema.org V30.0 (2026-03-19); confidence HIGH
- [Next.js: useReportWebVitals](https://nextjs.org/docs/pages/api-reference/functions/use-report-web-vitals) — App Router RUM hook; confidence HIGH
- [AI Crawler Cheat Sheet 2026 | Presenc AI](https://presenc.ai/research/ai-crawler-cheat-sheet) — AI crawler user-agent reference; confidence MEDIUM (cross-checked with OpenAI docs)
- [OpenAI Crawlers Overview](https://developers.openai.com/api/docs/bots) — OAI-SearchBot, GPTBot, ChatGPT-User confirmation; confidence HIGH
- [GA4 AI Assistant Channel 2026 | Digital Applied](https://www.digitalapplied.com/blog/ga4-ai-assistant-channel-2026-measure-ai-traffic-playbook) — native AI channel coverage and gaps; confidence HIGH
- [Track AI Referral Traffic in GA4 | Swydo](https://www.swydo.com/blog/track-ai-traffic-in-ga4/) — regex patterns and custom channel setup; confidence MEDIUM
- [State of llms.txt 2026 | Presenc AI](https://presenc.ai/research/state-of-llms-txt-2026) — adoption data and standardization status; confidence MEDIUM
- [llms.txt Explained May 2026 | Codesera](https://codersera.com/blog/llms-txt-complete-guide-2026/) — honest assessment of value vs hype; confidence MEDIUM
- [Generative Engine Optimization GEO 2026 | TechTimes](https://www.techtimes.com/articles/318359/20260614/generative-engine-optimization-geo-2026-how-get-your-content-cited-chatgpt-ai-overviews.htm) — GEO content patterns; confidence MEDIUM
- [Core Web Vitals 2026 | StudioMeyer](https://studiomeyer.io/en/blog/core-web-vitals-2026) — INP thresholds and measurement guidance; confidence HIGH
- [Rich Results Test Guide | Squin](https://squin.org/seo-tools/rich-results-test-guide/) — no public Rich Results Test API; confidence HIGH
- [LocalBusiness Schema 2026 | Medium/LocalRank-SEO](https://medium.com/@joosep_41274/schema-for-local-businesses-in-2026-what-to-implement-and-why-924a64fad212) — NailSalon subtype recommendation; confidence MEDIUM

---

*Stack research for: SEO + GEO tooling on multi-tenant Next.js 16 App Router*
*Researched: 2026-06-17*
