# Ongles Maily — Full SEO Audit

**Audited:** 2026-05-22 · **Environment:** local dev server (`localhost:3200`, Next.js 16.2.6)
**Site:** https://onglesmaily.com (bilingual FR default + EN)
**Pages crawled:** 30 / 30 sitemap URLs (all HTTP 200) · **Screenshots:** `seo-audit/screenshots/`

> ⚠️ Audited against the **dev server**, not a production build. Performance numbers
> are provisional — re-measure with `next build && next start` (or live prod) for real
> Core Web Vitals. All other findings (technical, on-page, schema, content, visual) are accurate.

---

## Executive Summary

**Overall SEO Health Score: 80 / 100** — strong technical foundation; content depth and image/CLS hygiene are the main levers.

**Business type:** Local service business — **Nail salon** (single location, Carrefour Beauport, Québec). Walk-in friendly ("sans rendez-vous"), bilingual market (FR primary, EN secondary).

### Top 5 issues
1. **2.55 MB `hero.png`** doubling as og:image — heavy LCP candidate + oversized social asset. *(High)*
2. ~~All 11 home images render with no dimensions → CLS~~ **CORRECTED: false positive.** All images use `next/image` `fill` inside space-reserving wrappers (aspect-ratio / fixed-height grid); the visual heuristic only checked raw `<img>` attrs. No CLS risk. *(resolved on review)*
3. **Thin content** — `/locations` ~174 words, `/book-online` ~138, `/gallery` ~109, `/about` ~233, `/services` ~224. *(High)*
4. **Generic interior `<title>` tags** — "Services — Ongles Maily", "Avis — Ongles Maily" lack location/keyword value. *(Medium)*
5. **`sameAs: []` empty** in LocalBusiness schema — no Google Business Profile / Facebook / Instagram links. *(Medium)*

### Top 5 quick wins
1. Compress/convert `hero.png` → WebP (~200–300 KB) + dedicated 1200×630 og image.
2. Add explicit `width`/`height` (or `aspect-ratio`) to all `<img>` + preload hero & display font.
3. Populate `sameAs` with GBP / Facebook / Instagram URLs (one-line schema change).
4. Rewrite 12 interior titles with location + service keywords; trim home meta description to ~155 chars.
5. Add `llms.txt` (currently 404) for AI-crawler guidance.

---

## Technical SEO — 92/100

| Check | Status |
|-------|--------|
| robots.txt | ✅ Present, `Disallow: /api/`, correct `Host` + `Sitemap` |
| Sitemap | ✅ 30 URLs, valid XML, `lastmod`/`changefreq`/`priority`, **hreflang alternates + x-default** |
| Canonicals | ✅ Self-referential absolute URL on every page |
| Indexability | ✅ `robots` meta = `index, follow`; `x-nextjs-prerender: 1` (static prerender) |
| HTTPS / origin | ✅ Absolute `https://onglesmaily.com` origin via `metadataBase` |
| 404 handling | ✅ Unknown path → 404; invalid locale `/de` → 307 redirect |
| Viewport | ✅ Present on all pages |
| **Security headers** | ✅ HSTS (preload), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |

**Minor nits:**
- `X-Powered-By: Next.js` exposed — suppress via `poweredByHeader: false`.
- **hreflang absent from HTML `<head>`** despite `alternates.languages` in `src/lib/seo.ts:84`. Sitemap hreflang is valid for Google so non-blocking — but verify the `languages` map is actually emitting.
- Invalid locale returns 307 rather than 404 — acceptable.

---

## On-Page SEO — 80/100

**Titles**
- ✅ Home: "Ongles Maily — Salon de manucure au Carrefour Beauport, Québec" (62 chars — ideal)
- ✅ Service detail: "Pose d'ongles chez Ongles Maily | Carrefour Beauport, Québec" (65)
- ⚠️ **Interior pages too generic & short:** Services (23), Contact (22), À propos (23), Avis (19). Recommend pattern: `<Service/Topic> + Ongles Maily | Beauport, Québec`.

**Meta descriptions** — present on every page. Home is 231 chars (too long); interior ones reasonable.

**Headings** — exactly **one `<h1>` per page**, healthy hierarchy (home: 1 h1 / 7 h2 / 11 h3). No skipped levels.

**Internal linking** — global nav + footer cover all primary pages; service hub → detail pages (ItemList confirms). Add contextual body links service detail → contact/book.

---

## Content Quality — 70/100

| Page (FR) | Words | Note |
|------|-------|------|
| `/fr` (home) | ~829 | ✅ Good |
| `/fr/services/pose-d-ongles` | ~628 | ✅ Good |
| `/fr/faq` | ~341 | OK |
| `/fr/reviews` | ~259 | Borderline |
| `/fr/about` | ~233 | ⚠️ Thin |
| `/fr/services` | ~224 | ⚠️ Thin (hub) |
| `/fr/locations` | ~174 | ⚠️ Thin |
| `/fr/contact` | ~159 | OK (transactional) |
| `/fr/book-online` | ~138 | ⚠️ Thin |
| `/fr/gallery` | ~109 | ⚠️ Thin (visual) |

**E-E-A-T:**
- ✅ Experience/Expertise — "15+ ans d'expérience", hygiene focus, specific services.
- ✅ Trust — real NAP (address, phone `+14186608228`, email), opening hours, single verifiable location.
- ⚠️ Authoritativeness — no owner/technician bio, no certifications, `sameAs` empty, no real reviews yet (placeholders; correctly **not** emitting fake `aggregateRating` — good call).

**Recommendations:** expand `/about` (owner story + credentials); enrich `/locations` (parking, transit, neighbourhood); add intro/benefit copy to `/services` hub and `/book-online`.

---

## Schema / Structured Data — 90/100

Excellent layered `@graph` implementation:

| Page type | Schema |
|-----------|--------|
| Global (all) | `NailSalon` (LocalBusiness) + `WebSite` |
| `NailSalon` node | address, geo (46.8606,-71.1947), telephone, email, priceRange `$$`, full `openingHoursSpecification` |
| Service hub | + `ItemList` + `BreadcrumbList` |
| Service detail | + `Service` + `FAQPage` + `BreadcrumbList` |
| FAQ | + `FAQPage` + `BreadcrumbList` |
| About/Contact/Reviews | + `BreadcrumbList` |

**Gaps:**
- ⚠️ `sameAs: []` empty — add GBP, Facebook, Instagram. Biggest schema win.
- No `aggregateRating` — **intentional & correct** until real reviews exist.

---

## Performance — 92/100 *(measured on prod build 2026-05-24)*

Real Core Web Vitals from a production build (`next build && next start`), desktop, unthrottled:

| Page | LCP | CLS | INP |
|------|-----|-----|-----|
| `/fr` (home) | 908 ms ✅ | 0.00 ✅ | — |
| `/fr/services/pose-d-ongles` | 819 ms ✅ | 0.00 ✅ | 1 ms ✅ |

All three CWV in the "good" band (LCP <2.5s, CLS <0.1, INP <200ms).

- **LCP element = hero image**, downloaded in ~1 ms (WebP, `priority`, not render-blocking). Image optimization work confirmed effective. LCP is ~98% render delay (React + web fonts), not assets — Lighthouse reports no actionable savings.
- **CLS 0.00** on both pages — `next/image` `fill` reserves space correctly (confirms the earlier false-positive correction).
- Static prerender (`x-nextjs-prerender: 1`); `X-Powered-By` suppressed in prod.

**Caveats:** unthrottled desktop lab numbers; no field data (CrUX) yet (site not live/trafficked). Under mobile CPU throttle the ~800 ms render delay grows — re-check via Search Console / CrUX once live. Optional: preload the two `next/font` faces to trim render delay.

---

## Images — 70/100

- ✅ **Alt text: 11/11 home images have non-empty alt.** None missing.
- ✅ `next/image` used everywhere with reserved space (no CLS).
- ✅ **DONE: hero + 4 home PNGs (11 MB) → WebP (416 KB, −96%);** og:image now a dedicated 382 KB JPEG. Gallery images already lightweight (≤372 KB).

---

## Visual / UX (mobile 390px + desktop 1280px)

Screenshots: `seo-audit/screenshots/fr-{home,service-pose-ongles,contact}-{desktop,mobile}.png`

- ✅ **Home above-fold (mobile): excellent** — H1, value-prop subtext, BOTH CTAs ("Réserver en ligne" + "Appeler pour réserver" with phone icon), and "Sans RDV / Bienvenue" trust badge all visible without scrolling. Walk-in + phone prominence is exactly right.
- ⚠️ **Service page:** no booking CTA in static fold (only floating button); large placeholder hero pushes body copy down.
- ⚠️ **Contact:** phone `(418) 660-8228` and address sit **below the fold** — surface the number higher given the walk-in model.
- ⚠️ **Floating buttons overlap body text** on service/contact pages (cover "Obtenir l'itinéraire" link & paragraphs) — add bottom margin/safe-area so they don't obscure tappable content.
- ✅ No horizontal overflow (390px), no broken images, viewport correct everywhere. Grey service hero is an intentional text-placeholder, not a 404.

---

## AI Search Readiness — 80/100

- ✅ Rich structured data (LocalBusiness + FAQPage + Service) → highly citable for AI Overviews / ChatGPT / Perplexity local queries.
- ✅ Consistent NAP + hours — what AI assistants extract for "nail salon near Carrefour Beauport".
- ✅ FAQ content in schema = passage-level citable Q&A.
- ⚠️ **`llms.txt` missing (404)** — add for AI-crawler guidance.
- ⚠️ Empty `sameAs` weakens entity disambiguation.

---

## Score Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Technical SEO | 25% | 92 | 23.0 |
| Content Quality | 25% | 70 | 17.5 |
| On-Page SEO | 20% | 80 | 16.0 |
| Schema | 10% | 90 | 9.0 |
| Performance* | 10% | 70 | 7.0 |
| Images | 5% | 70 | 3.5 |
| AI Readiness | 5% | 80 | 4.0 |
| **Total** | | | **≈ 80 / 100** |

\* provisional — dev-mode measurement.
