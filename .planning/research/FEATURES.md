# Feature Research

**Domain:** Multi-tenant local nail salon — AI-search (GEO) + classic SEO optimization
**Researched:** 2026-06-17
**Confidence:** HIGH (multiple independent sources cross-checked; codebase directly inspected)

---

## Shipped vs. Net-New — Quick Reference

| Feature | Status |
|---------|--------|
| Service pages `services/[slug]` with FAQPage + Service + BreadcrumbList schema | SHIPPED |
| LocalBusiness / NailSalon + WebSite JSON-LD in layout | SHIPPED |
| AggregateOffer price range on services | SHIPPED |
| BreadcrumbList on every sub-page | SHIPPED |
| Sitewide FAQ page with FAQPage schema | SHIPPED (thin — 11 items) |
| Per-service FAQ blocks (3 items each) | SHIPPED (thin) |
| llms.txt serving key pages + business facts | SHIPPED |
| robots.txt allowing all crawlers incl. AI bots | SHIPPED |
| FR/EN hreflang + canonical | SHIPPED |
| OG + Twitter card | SHIPPED |
| AggregateRating on NailSalon node | SHIPPED (conditional on reviewsFetchedAt) |
| Individual Review schema | NOT SHIPPED |
| Direct-answer blocks on landing/service pages | NOT SHIPPED |
| Dedicated pricing / cost page | NOT SHIPPED |
| Comparison / decision pages ("X vs Y", "best for") | NOT SHIPPED |
| Near-me / neighborhood landing pages | NOT SHIPPED |
| Knowledge-hub FAQ depth (30+ questions per tenant) | NOT SHIPPED |
| llms.txt depth: pricing, comparison, near-me links | NOT SHIPPED |
| AI-referrer GA4 channel group + event tracking | NOT SHIPPED |
| Speakable schema | NOT SHIPPED |
| Organization `sameAs` social profiles (populated) | PARTIAL (field exists, data completeness unknown) |

---

## Feature Landscape

### Table Stakes (Users and AI Engines Expect These)

Missing any of these signals means the site is interpretably incomplete to both crawlers and AI answer engines, and competitors with them win citations.

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Per-page direct-answer blocks | AI engines extract 130–170 word self-contained answer passages; 55% of AI Overview citations come from first 30% of page content. Pages that bury the answer lose to pages that lead with it. | MEDIUM | NOT SHIPPED | Applies to homepage hero copy, each service page intro, FAQ answers, and the about page. Pattern: concise factual answer in first 150 words, then depth. No new routes needed — content editing + copy discipline. |
| FAQ knowledge hub depth ≥ 25–30 questions per tenant | AI systems answer conversational queries by lifting FAQ answers verbatim. The current 11-item sitewide FAQ plus 3 per-service is too thin to cover the long tail ("how long does a fill take?", "difference between gel and acrylic?", "how to remove nail enhancements at home?"). | LOW | NOT SHIPPED | FAQ data lives in `dictionaries/{locale}.json` — adding items is pure content work with zero code change. Already has FAQPage schema emitting. Note: Google deprecated FAQ rich results (May 2026) — the visual dropdown is gone, but FAQPage schema is still crawled by PerplexityBot and Bingbot and aids AI extraction. |
| Dedicated pricing / cost page | BrightLocal 2026: AI is the 3rd most-used channel for local business discovery. AI comparison queries ("how much does a fill cost in Québec?") cite structured pricing pages, not inline prices. Pricing transparency is an active ranking signal for comparison-intent queries. | MEDIUM | NOT SHIPPED | Net-new route: `/[lang]/prix` (FR) / `/[lang]/pricing` (EN). Pulls from `services[]` config already populated. Emits `ItemList` of `Service` + `AggregateOffer` with explicit `priceCurrency: "CAD"`. Needs `routeByLocale` for hreflang. Depends on: complete per-tenant service pricing data (Phase 1 prerequisite). |
| NAP + hours entity consistency | AI answer engines cross-reference the business's on-site NAP (name/address/phone/hours) against GBP, directories, and the JSON-LD graph. Mismatches reduce citation confidence. | LOW | PARTIAL | Current schema emits full PostalAddress + OpeningHoursSpecification. Gap is secondary tenants (ongles-charlesbourg, ongles-rivieres) with incomplete config. Blocking: Phase 1 data completion. |
| AggregateRating on NailSalon — always emitted | Currently conditional on `reviewsFetchedAt`. Until real Google review data is imported, the rating node is suppressed — removing a key AI comparison signal. | LOW | PARTIAL | Either import real GBP ratings into tenant config, or emit a conservative placeholder that reflects real data once populated. Do not fabricate ratings. |
| Robots.txt allowing AI crawlers | OAI-SearchBot, PerplexityBot, Claude-SearchBot must not be blocked. | LOW | SHIPPED | Current `allow: "/"` is correct. Monitor for accidental tightening. |
| Sitemap with all tenant routes | Sitemap must enumerate service pages so AI crawlers discover them without relying on link traversal. | LOW | PARTIAL | Verify sitemap includes `services/[slug]` routes for all tenants. |

### Differentiators (Competitive Advantage)

These are above what Quebec nail salon competitors typically publish. Each maps directly to a citation pattern AI engines prefer when generating comparative answers.

| Feature | Value Proposition | Complexity | Status | Notes |
|---------|-------------------|------------|--------|-------|
| Comparison / decision pages | AI engines are explicitly asked "gel vs. acrylic nails — which lasts longer?" and "best service for short nails." Sites with a page that directly answers the comparison query get cited; sites without one get skipped. These are bottom-of-funnel pages with highest AI referral conversion. | HIGH | NOT SHIPPED | Net-new routes: `/[lang]/services/gel-vs-acrylique` (FR) + EN equivalent. Structure: H1 answers the comparison, quick verdict block ≤ 100 words, comparison table (durability / price / maintenance / best for), per-option FAQ. Emits: `FAQPage` + `BreadcrumbList` + `Article` schema. Depends on: service content completeness. Complexity is HIGH because it requires bilingual copywriting, localized slugs (`routeByLocale`), and a repeatable template for N comparisons. |
| Near-me / neighborhood landing pages | "Nail salon near Carrefour Beauport" and "nail salon Beauport Québec" are high-intent "near me" queries. Dedicated pages with embedded map, neighborhood name in H1, and unique 600-word content outrank generic location pages for these terms. AI engines also synthesize city-specific answers from these pages. | HIGH | NOT SHIPPED | Net-new route: `/[lang]/nail-salon-beauport` or similar per neighborhood the salon serves. Must include: geo-specific H1, embedded Google Map, address block, unique descriptive copy (not a duplicate of the homepage). Emits: `LocalBusiness` + `BreadcrumbList`. Depends on: per-tenant location data + copywriting. One per tenant minimum. |
| Individual Review schema (visible on page) | Google deprecated star rich results for bare `LocalBusiness` entities but allows them for `Service` or `Product`. Embedding individual `Review` objects with `author` and `reviewBody` under Service nodes enables star snippets on service pages, and gives AI engines citable reviewer language. | MEDIUM | NOT SHIPPED | Add `review[]` array to `serviceGraph()` builder. Data source: import a curated subset of genuine Google reviews per service. Requires: real review text + author names stored in tenant config or Supabase. Do not fabricate. |
| AI-referrer measurement (GA4 channel group + events) | Without measurement, the team cannot tell whether GEO work is driving sessions or conversions. ChatGPT, Claude, Perplexity, and Gemini all send referrer headers from their citation links, but 70% arrive as direct (no referrer) — a custom channel group is required to separate AI-referred traffic from organic direct. | MEDIUM | NOT SHIPPED | Implementation: GA4 custom channel group matching `chatgpt\.com\|perplexity\.ai\|claude\.ai\|gemini\.google\.com\|copilot\.microsoft\.com`. Supplement with UTM tagging on llms.txt page links. Requires GA4 admin access. Zero code change to Next.js app; lives in GA4 config + optionally a lightweight `CustomCode` snippet injected per tenant. |
| Speakable schema on FAQ answers | `SpeakableSpecification` tells Google Assistant and voice-capable AI engines which text passages are designed to be read aloud as answers. Nail salon discovery queries ("is Ongles Maily open on Sundays?") are frequently voice-driven. | LOW | NOT SHIPPED | Add `speakable` property to the `FAQPage` graph node, pointing to the CSS selectors of the `<dt>`/`<dd>` answer pairs already in the DOM. Low complexity — one property addition to `faqPageGraph()` builder. |
| llms.txt depth: pricing + comparison + near-me links | Current llms.txt lists 8 key pages. Once pricing and comparison pages exist, they must be linked from llms.txt with descriptive anchors ("gel vs. acrylic comparison", "full pricing in CAD") so agentic tools crawling llms.txt discover them without web search. | LOW | NOT SHIPPED | Extend the `route.ts` `body` template with new page entries. Pure content addition after new pages ship. Depends on: pricing + comparison pages existing first. |
| Knowledge-hub FAQ: 30+ curated questions | Deepening FAQ from 11 to 30+ questions per tenant significantly widens the long-tail query surface. Queries like "how long does gel manicure last", "can I get acrylics if I have thin nails", "difference between fill and full set" are answered by AI directly from FAQ pages when those pages exist. | LOW-MEDIUM | NOT SHIPPED | Pure content work per tenant in `dictionaries/{locale}.json`. Zero code change — FAQPage schema already emits all items. Must maintain FR/EN key parity (CLAUDE.md requirement). Category structure recommended: Booking, Services, Pricing, Hygiene, Aftercare. |

### Anti-Features (Deliberately Skip)

| Feature | Why It Seems Useful | Why It's Problematic | What to Do Instead |
|---------|---------------------|----------------------|--------------------|
| Self-hosted review aggregation (fake or solicited) | Star ratings look trustworthy. | Google's self-serving review restriction (updated 2019, still enforced 2026) means LocalBusiness/Organization review stars are ineligible for rich results when the business controls the content. Fabricated or solicited reviews risk manual penalties. | Import only genuine Google/third-party reviews. Emit `AggregateRating` on Service nodes (eligible type), not just the LocalBusiness node. |
| FAQ schema removal post-May-2026 deprecation | Google dropped FAQ rich results; seems obsolete. | FAQPage is a valid schema.org type. Google's change removed a SERP display feature, not the schema. PerplexityBot and Bingbot still consume it; AI extraction still benefits from the structured signal. Removing it gains nothing and costs machine readability. | Keep FAQPage schema everywhere it reflects genuine visible Q&A. Stop treating it as a SERP-dropdown trick. |
| Generic "Services" umbrella page as the only service entry | Simpler to maintain one list. | Generic service lists never rank for individual service queries. AI engines need a dedicated URL with 500–1000 words of focused content to cite a specific service. | Keep the hub page (`/services`) for navigation, but ensure `services/[slug]` detail pages are the citation target. Already partially done. |
| Keyword-stuffed neighborhood copy | Appears to signal local relevance. | Algorithmic patterns detect keyword stuffing; penalties outweigh gains. "nail salon Beauport nail salon Québec nail salon Carrefour" in one paragraph is a ranking liability. | Write 600+ words of genuinely useful neighborhood-specific content (parking, transit, nearby landmarks, what makes this location unique). |
| Replacing GA4 / swapping analytics platform | Better AI referrer data. | Out of scope per PROJECT.md. Adds deployment risk with no differential upside over GA4 custom channel groups. | Add a GA4 custom channel group + UTM segments. Zero platform risk. |
| Off-site link building as engineering work | Citations require authority. | Off-site outreach is a marketing-ops activity, explicitly out of scope per PROJECT.md. On-site structure enables citations; outreach executes them. | Ship the citation-worthy pages (pricing, comparison, deep FAQ). Outreach can reference them later. |
| Blocking AI training bots to "protect" content | Concerns about content scraping. | BrightLocal 2026: blocking OAI-SearchBot, PerplexityBot, Claude-SearchBot reduces citation visibility with no measurable content-protection benefit for a local service site. Only 408 of 500M+ AI bot visits targeted llms.txt directly. | Leave bots open (current robots.ts is correct). Monitor via server logs rather than blocking. |

---

## Feature Dependencies

```
Per-tenant config completeness (Phase 1)
    └──required by──> Pricing page (accurate prices per tenant)
    └──required by──> Comparison pages (service data per tenant)
    └──required by──> Near-me pages (address/geo per tenant)
    └──required by──> AggregateRating always-emitted (review counts per tenant)

Pricing page ships
    └──then──> llms.txt depth update (link to /prix)

Comparison pages ship
    └──then──> llms.txt depth update (link to comparisons)

Near-me pages ship
    └──then──> llms.txt depth update (link to neighborhood pages)

Real Google review data imported
    └──required by──> Individual Review schema on Service nodes
    └──required by──> AggregateRating unconditional emission

FAQ depth expanded (30+ items)
    └──enhances──> Speakable schema (more answers to mark speakable)
    └──enhances──> Direct answer blocks (FAQ answers already follow pattern)

Direct answer blocks (content discipline)
    └──no code dependency──> any page, editorial-only change

GA4 channel group
    └──no code dependency in Next.js app──> GA4 admin config + optional CustomCode snippet
```

### Dependency Notes

- **Pricing + comparison + near-me pages all require Phase 1 config completion.** Do not build these pages until per-tenant service menus with pricing, and location data, are complete for all tenants. An empty price field in a pricing page is worse than no pricing page.
- **Individual Review schema requires real review data.** Do not emit fabricated or placeholder review content. The data pipeline (GBP API → tenant config → schema) must be built before the schema node ships.
- **Direct answer blocks and FAQ depth have zero code dependencies.** They are pure content edits that can begin immediately in parallel with Phase 1 config work.
- **GA4 measurement has zero app code dependency.** It belongs in GA4 admin configuration plus optionally a `customCode` snippet. It should ship before or concurrent with new pages to capture baseline and compare.

---

## MVP Definition (for this milestone)

### Phase 1 Prerequisite (blocks everything else)

- [ ] Complete per-tenant config for all tenants: NAP, hours, full service menu with pricing — this unblocks pricing + comparison + near-me pages.

### Launch With — Classic SEO + GEO Foundation

- [ ] Direct answer blocks on homepage hero, each service page intro, and FAQ answers — highest citation ROI, zero code change, starts immediately.
- [ ] FAQ knowledge hub expanded to 25+ questions per tenant — widest long-tail query coverage for lowest effort; already has FAQPage schema emitting.
- [ ] Pricing page (`/prix` / `/pricing`) per tenant — single highest-value net-new page type for AI comparison queries; depends on Phase 1.
- [ ] AggregateRating always-emitted — fill real review counts into tenant config; emit unconditionally once data is present.
- [ ] AI-referrer GA4 channel group — measurement before new pages so you have a baseline.

### Add After Foundation Ships

- [ ] Comparison pages ("gel vs. acrylique", "pose complète vs. remplissage") — bilingual, localized slugs, highest differentiation potential.
- [ ] Near-me / neighborhood landing pages — one per tenant location, geo-targeted H1 + map.
- [ ] Speakable schema on FAQ answers — low effort once FAQ depth is complete.
- [ ] Individual Review schema on Service nodes — requires real review data pipeline.
- [ ] llms.txt depth extension — add links to pricing, comparison, near-me pages once they exist.

### Future (v2+)

- [ ] HowTo schema on aftercare / how-to-book sections — valid schema type, helps voice queries, but lower ROI than pricing/comparison/FAQ for this domain.
- [ ] Video schema (if salon begins publishing Instagram reels / YouTube) — ImageGallery schema already exists; video requires a hosting decision.
- [ ] Multi-location comparison pages ("which Ongles location is closest to me?") — only relevant once 3+ tenants are fully configured.

---

## Feature Prioritization Matrix

| Feature | Citation/Ranking Value | Implementation Cost | Priority |
|---------|----------------------|---------------------|----------|
| Direct answer blocks (content discipline) | HIGH — 55% of AI Overview citations from first 30% of page | LOW — copy editing only | P1 |
| FAQ depth 25–30+ items per tenant | HIGH — widest long-tail AI query coverage | LOW — dict JSON edits only | P1 |
| Pricing page `/prix` / `/pricing` | HIGH — most-cited page type for comparison queries | MEDIUM — new route + schema | P1 |
| AI-referrer GA4 measurement | HIGH — without this, nothing is measurable | LOW — GA4 config only | P1 |
| AggregateRating unconditional emission | MEDIUM — AI comparison answers cite ratings | LOW — config data fill | P1 |
| Comparison pages ("X vs Y") | HIGH — bottom-of-funnel, low competitor coverage | HIGH — bilingual copy + new routes | P2 |
| Near-me neighborhood pages | HIGH for local 3-pack + AI city queries | HIGH — unique copy + geo targeting | P2 |
| Speakable schema on FAQ | MEDIUM — voice + AI assistant queries | LOW — one schema property | P2 |
| Individual Review schema | MEDIUM — star snippets on service pages | MEDIUM — requires data pipeline | P2 |
| llms.txt depth extension | LOW standalone, compound after new pages ship | LOW — template string edits | P3 |

---

## Sources

- [Answer Engine Optimization: Complete AEO Guide 2026 — Frase.io](https://www.frase.io/blog/what-is-answer-engine-optimization-the-complete-guide-to-getting-cited-by-ai)
- [AEO Techniques 2026: Complete Guide — GenOptima](https://www.gen-optima.com/blog/aeo-techniques-2026-complete-guide/)
- [How AI Answer Engines Choose Sources — DubSEO](https://www.dubseo.co.uk/insights/how-ai-answer-engines-choose-sources-2026-authority-citation-framework)
- [Local SEO for Nail Salons — RankTracker](https://www.ranktracker.com/blog/nail-salon-seo/)
- [7 Local SEO Secrets for Salon Owners — My Salon Guide](https://mysalonguide.com/lifestyle/local-seo-salons-2026-rank-near-me/)
- [How to Rank #1 for Best Nail Salon Near Me — ExterMarketing](https://extermarketing.com/post/how-to-rank-1-for-best-nail-salon-near-me-seo-strategy)
- [Can local businesses use review schema? — BrightLocal](https://www.brightlocal.com/learn/review-schema/)
- [Review Schema Markup Complete Guide 2026 — Koanthic](https://koanthic.com/en/review-schema-markup-complete-guide-examples-2026/)
- [Google Review Snippet documentation — Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [FAQ Rich Results Deprecated: May 2026 Change — PassionFruit](https://www.getpassionfruit.com/blog/what-changed-with-google-drops-faq-rich-results-and-what-to-do-now)
- [Google FAQ Rich Results No Longer Supported — ALM Corp](https://almcorp.com/blog/google-faq-rich-results-no-longer-supported/)
- [E-E-A-T for Business: Trust Signals AI Search Engines Want 2026 — Revved Digital](https://revved.digital/eeat-ai-search-ranking-signals-2026/)
- [Google E-E-A-T in 2026 — Keywords Everywhere](https://keywordseverywhere.com/blog/google-e-e-a-t-guidelines-an-overview/)

---

*Feature research for: Multi-tenant nail salon — AI-search optimization milestone*
*Researched: 2026-06-17*
