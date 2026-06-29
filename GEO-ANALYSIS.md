# GEO Analysis — ongles-website (multi-tenant nail-salon platform)

> Generative Engine Optimization audit (AI Overviews, ChatGPT, Perplexity).
> Generated 2026-06-28. Scope: codebase static analysis of `src/` SSR output,
> schema, `robots.ts`, `llms.txt`, `sitemap.ts`. Off-site signals estimated.

## 1. GEO Readiness Score: 70 / 100

| Dimension | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Citability | 25% | 18/25 | Rich `llms.txt`, FAQ, comparison guides; thin per-passage facts/dates |
| Structural readability | 20% | 16/20 | Clean H1→H2, FAQ, comparison tables; good |
| Multi-modal | 15% | 8/15 | Gallery images only; no video, no infographics |
| Authority & brand | 20% | 9/20 | No dates, no author credentials, aggregate-only reviews, weak off-site presence |
| Technical accessibility | 20% | 19/20 | SSR `force-dynamic`, all crawlers allowed, `llms.txt`, geo meta, full schema |

This is an already-strong technical foundation. The gap is **authority/freshness signals**, not crawlability.

## 2. Platform Breakdown

| Platform | Est. score | Driver |
|----------|-----------|--------|
| Google AI Overviews | 76/100 | Strong LocalBusiness schema + SSR + sitemap; needs freshness dates |
| ChatGPT (web search) | 68/100 | `llms.txt` excellent; weak Wikipedia/Reddit entity presence |
| Perplexity | 60/100 | Reddit/community validation near-zero — its top citation source |

## 3. AI Crawler Access Status

`src/app/robots.ts` emits `User-agent: *` → `Allow: /`, `Disallow: /api/`, plus `host` and `sitemap`.

| Crawler | Status |
|---------|--------|
| GPTBot, OAI-SearchBot, ChatGPT-User | ✅ allowed (via `*`) |
| ClaudeBot, anthropic-ai | ✅ allowed |
| PerplexityBot | ✅ allowed |
| CCBot (training) | ✅ allowed (not blocked) |

All AI search crawlers reach the site. `/api/` correctly excluded. No per-crawler rules — acceptable for a local business that wants maximum visibility. Optionally block `CCBot`/`Bytespider` (training-only) if licensing is a concern; not required.

## 4. llms.txt Status: ✅ Present & strong

`src/app/llms.txt/route.ts` (SSR, per-tenant, generated from `getStoreConfig()`).
Includes: intro blockquote, contact/location, hours, services+CAD pricing, booking link, FR canonical key pages, comparison guides, borough near-me, EN equivalents. Uses stable `canonicalUrl` for links (correct — survives tenant host switches).

Minor improvements:
- Add a one-line "Last updated: YYYY-MM" so crawlers see freshness.
- `serviceLines` emit `- {s.id}: $price CAD` — `s.id` is a slug, not a human label. Use the service display name for better extractability.

## 5. Brand Mention Analysis (off-site — biggest gap)

Brand mentions correlate **3× stronger with AI visibility than backlinks** (Ahrefs Dec 2025). Codebase can't show off-site presence, but for local salons these are almost certainly weak:

| Signal | Likely state | Action |
|--------|-------------|--------|
| Google Business Profile | Probably exists | Verify, keep hours/photos synced to site |
| Wikipedia / Wikidata | Absent | N/A for local salon (skip) |
| Reddit (r/Quebec, r/QuebecCity, nail subs) | Absent | **High impact for Perplexity** |
| YouTube | Absent | Strongest citation correlate (~0.74); nail-art shorts |
| Instagram / Facebook | Likely exists | Cross-link in schema `sameAs` |

Check `sameAs` coverage in `organizationGraph` (`src/lib/seo.ts`) — ensure every active social profile is listed.

## 6. Passage-Level Citability (optimal 134–167 words)

Present and good: FAQ (`get-tenant-faq.ts`), 4 comparison buying-guides (`/comparaisons/*`), service pages.

Gaps:
- No self-contained "What is [X]?" definition blocks in the first 40–60 words of service/comparison sections.
- Pricing exists in schema but is not always restated as a quotable sentence in body copy ("A full gel set costs $X–$Y CAD and takes ~N minutes").
- No specific, unique data points (e.g., "15+ years experience" appears in `about` — good — but isn't surfaced as a quotable stat block on commercial pages).

## 7. Server-Side Rendering Check: ✅ Pass

`src/app/[lang]/layout.tsx` sets `export const dynamic = "force-dynamic"`. Pages render server-side per request (tenant selected via env). AI crawlers (which do **not** execute JS) receive full HTML including JSON-LD. GA4/consent scripts are client islands — they do not gate content. No client-only content risk found.

## 8. Schema Recommendations

In use (`src/lib/seo.ts` + pages): `NailSalon`, `Organization`, `WebSite`, `PostalAddress`, `OpeningHoursSpecification`, `GeoCoordinates`, `Service`, `Offer`, `AggregateOffer`, `AggregateRating`, `FAQPage`, `Question`/`Answer`, `BreadcrumbList`, `ItemList`, `ImageGallery`, `ImageObject`. Excellent coverage.

Add:
1. **Individual `Review` nodes** with `reviewRating`, `author`, `datePublished` — currently reviews are aggregate-only (`AggregateRating`). Individual reviews with dates are highly citable and AIO-eligible. Source already has 6 named authors in `content.*.json`.
2. **`dateModified`** on key pages (Service, FAQPage, WebPage) — no date signal exists anywhere in schema. This is the single highest-value schema add for freshness.
3. **`HowTo`** for any "how to prepare for your appointment" / aftercare content.
4. **`priceRange`** ("$$"-style) on `NailSalon` if not present — common AIO local field.

## 9. Server-Side Rendering / JS Dependency: confirmed clean (see §7).

## 10. Top 5 Highest-Impact Changes

1. **Add `dateModified` to page/Service/FAQ schema** (and "Last updated" to `llms.txt`). Freshness is the biggest missing signal — low effort, sitewide. *(quick win)*
2. **Emit individual `Review` schema** with `datePublished` + `author` from existing `content.*.json` reviews. High citability for AIO/Perplexity. *(medium)*
3. **Build Reddit + YouTube presence** for the salon's city/borough — Perplexity's and ChatGPT's top citation sources; brand mentions beat backlinks 3×. *(high impact, off-site)*
4. **Add "What is [X]?" definition blocks** (40–60 words) at the top of each service and comparison section, plus quotable price+duration sentences. *(medium)*
5. **Verify `sameAs` lists every social profile** in `organizationGraph`, and confirm Google Business Profile mirrors site hours/services. *(quick win)*

---

### Content reformatting examples

**Service page — lead with extractable definition + price:**
> Le remplissage d'ongles en gel consiste à combler la repousse à la base de l'ongle, 2 à 3 semaines après la pose. Comptez 45–60 minutes et 35–45 $ CAD chez {salon}. Recommandé toutes les 3 semaines pour préserver la tenue.

**FAQ — keep each answer self-contained (one fact, no cross-reference):**
> **Faut-il réserver?** Oui, la réservation en ligne est recommandée. {salon} accepte aussi les sans-rendez-vous selon les disponibilités, du mardi au samedi, {hours}.
