# Pitfalls Research

**Domain:** Multi-tenant local-service (nail salon) — SEO + GEO optimization
**Researched:** 2026-06-17
**Confidence:** HIGH (structured data/schema/hreflang from Google official docs + community consensus; GEO from aggregated 2025–2026 practitioner research)

---

## Critical Pitfalls

### Pitfall 1: Structured Data Mismatch — Schema Content Does Not Match Visible Page Content

**What goes wrong:**
Schema markup describes content that is not visibly present on the page. Classic examples: an `aggregateRating` value in JSON-LD that differs from what the page visually shows, `Service` schema referencing a service not in the visible service list, or `FAQPage` markup on a page that does not display those FAQs to users. Google's March 2026 core update specifically tightened enforcement: supplementary schema on off-topic page sections was stripped of rich result eligibility at scale.

**Why it happens:**
Developers copy schema templates and fill in values that diverge from the real CMS data. In this codebase, `google-reviews.json` starts as a stub (`ratingValue: 0`, `reviewCount: 0`) and the fetch script is manual — if schema is emitted from that stub, it will not match visible content. Per-tenant services config has 15+ TODOs; if schema is generated before those TODOs are filled, schema will reference placeholder or default values that differ from what renders.

**How to avoid:**
- Schema must be generated from the same data source that drives the visible UI — never hardcode values separately.
- Block schema emission for any field that falls back to a stub/zero default. Emit `aggregateRating` only when `reviewCount > 0` and reviews are actually visible on the page.
- Run Google Rich Results Test and `schema.org` validator on every tenant after each config change.
- Lint step in CI: assert JSON-LD `ratingValue`/`reviewCount` equals what `google-reviews.json` reports (not a hardcoded value).

**Warning signs:**
- `google-reviews.json` has `ratingValue: 0` but a star rating renders in search results.
- Schema Markup Validator reports no errors but Search Console > Enhancements shows "Item not eligible" for a rich result type.
- FAQ rich result impressions drop after a page edit that removed visible FAQ content without removing `FAQPage` schema.

**Phase to address:** Phase 1 (prerequisite: complete per-tenant config + reviews fetch integration before any schema audit runs).

---

### Pitfall 2: Fake or Self-Serving Review Schema — Manual Action Risk

**What goes wrong:**
`Review` or `AggregateRating` schema is added using invented, placeholder, or self-written review content, or the `ratingValue`/`reviewCount` does not match an independently-verifiable review source. Google's enforcement intensified through 2025–2026: self-serving reviews (written by the business or staff) in schema are prohibited since August 2023, and by 2026 Google reportedly revokes entire-site rich result eligibility on detection — not just the affected page.

**Why it happens:**
The `google-reviews.json` stub exists and is checked into the repo. If schema is wired to emit from this file before real reviews are fetched, a developer might manually set `ratingValue: 4.9` and `reviewCount: 47` in the stub to "make the rich snippet appear" during development — and ship that to production. On secondary tenants (ongles-charlesbourg, ongles-rivieres) with config TODOs and no real Google Business Profile IDs yet, there is no real review source at all.

**How to avoid:**
- Guard: emit `aggregateRating` schema only when `google-reviews.json` was fetched within the last 90 days (`fetchedAt` is not null) AND `reviewCount >= 5`.
- Never manually set `ratingValue`/`reviewCount` in config or stub files.
- For secondary tenants with no GBP ID yet: omit `Review` and `aggregateRating` schema entirely rather than using placeholder values.
- Document in the codebase (`src/lib/reviews.ts`) that stub values must not be used for schema emission.

**Warning signs:**
- `google-reviews.json` has `fetchedAt: null` but `AggregateRating` appears in Search Console Enhancement reports.
- A tenant config has a hardcoded `rating` field in `site.ts` that diverges from `google-reviews.json`.
- Search Console shows a "Manual action" under Security & Manual Actions for "Spammy structured markup."

**Phase to address:** Phase 1 (reviews fetch integration) + Phase 2 (schema completeness audit per tenant).

---

### Pitfall 3: Duplicate Content Across Tenant Pages — Silent Filtering, Not Penalty

**What goes wrong:**
Multiple tenants share the same Next.js templates, dictionary strings, and service descriptions. If per-tenant service pages differ only by swapped location name, they are near-identical — Google clusters them and filters all but one from results for their respective target queries. Unlike a penalty (which is visible and dramatic), this filtering is silent: all pages appear indexed in Search Console, but only one shows up in SERPs. Secondary tenants effectively disappear for their own local queries.

**Why it happens:**
This is inherent to the multi-tenant architecture. The same component tree, same service copy from `services.ts`, same dictionary strings render for every tenant. The "unique" content is only the NAP, hours, and a few config strings. The proportion of shared-to-unique content on a typical service page is extremely high — well above the 60% threshold at which filtering risk becomes significant.

**How to avoid:**
- Every tenant service page must have a unique opening paragraph (first ~150 words) written specifically for that location, not derived from a shared template string.
- Tenant configs must include location-specific "about" copy: neighbourhood context, nearest landmarks, transit access — content that is factually unique per location and cannot be templated.
- Each tenant's `services.ts` should include location-specific notes for at least the top 3 services (e.g., a technique specialty the location is known for, language spoken by staff, parking availability).
- Use `canonical` self-referencing per tenant domain/route — never canonicalize a secondary tenant's page to the primary tenant.
- Audit with Siteliner or Screaming Frog similarity scores after each content update; target < 30% sentence-level similarity between tenants for the same page type.

**Warning signs:**
- GSC shows both tenant domains indexed for "manucure [city]" but impressions are near zero for the secondary tenant.
- Ahrefs/Semrush shows one tenant domain cannibalizing another's target keyword.
- Service page content diff between tenants is < 200 words of unique text.

**Phase to address:** Phase 1 (per-tenant config + copy completion) is the foundational fix; Phase 2 (content depth for GEO) reinforces it.

---

### Pitfall 4: hreflang/Canonical Conflicts Across Locales and Tenants

**What goes wrong:**
In a multi-tenant, multi-locale setup (FR default + EN, separate domains per tenant), hreflang errors compound multiplicatively. The most damaging: canonical tags pointing cross-locale instead of self-referencing (e.g., `/en/services/manucure` canonicalizes to `/fr/services/manucure`), or hreflang annotations referencing non-canonical, noindex, or non-200 URLs. When canonical and hreflang conflict, Google follows canonical and silently ignores the hreflang — the EN locale gets no independent ranking signal and EN traffic is invisible in SERPs.

**Why it happens:**
`force-dynamic` rendering means locale is resolved at runtime. If the canonical URL is built from `request.url` or a hardcoded base without locale, it can emit the wrong canonical per locale. The `x-default` hreflang value is often left pointing to the homepage rather than a true locale-neutral entry point. Reciprocity (every locale page must list all other locales) is easy to break when adding a new locale.

**How to avoid:**
- Self-referencing canonical per locale page is mandatory. The FR variant canonicalizes to FR; the EN variant canonicalizes to EN — never cross-locale.
- `hreflang` annotations must use only absolute URLs and must all be ISO 639-1 language codes (use `fr-ca` not `fr-FR` if targeting Canadian French; use `en-ca` for Canadian English).
- `x-default` must point to the FR route (the natural default for Quebec salons), not the homepage root.
- All URLs in hreflang annotations must return HTTP 200. Add a CI check that fetches each hreflang URL and asserts 200.
- Use a single implementation method (HTML `<head>` link tags, not also in sitemap) to avoid conflicts.
- On each locale page, include the page's own locale in its hreflang set (self-reference in hreflang is required per spec).
- After adding each new tenant: run Screaming Frog or `sitemap-validator` to verify reciprocity across all locale variants.

**Warning signs:**
- Search Console shows the EN locale pages are crawled but not indexed ("Alternate page with proper canonical tag" instead of "Indexed").
- GSC International Targeting (or Coverage report post-2025) shows hreflang errors.
- Organic traffic from English-language queries is < 5% of total despite EN locale being live.
- `curl -I https://tenant.com/en/services/slug` returns the FR canonical URL.

**Phase to address:** Phase 2 (schema + technical SEO audit); must be validated before any content expansion.

---

### Pitfall 5: NAP Inconsistency Across Tenants and External Profiles

**What goes wrong:**
Name, Address, Phone (NAP) appearing in different formats across the site, Google Business Profile, Yelp, and other directories erodes local ranking trust. For multi-tenant sites, the risk doubles: each tenant has its own NAP, and inconsistency between the in-code config, the JSON-LD schema, the footer, and the GBP listing causes Google to distrust all signals for that entity. A mismatch as minor as "450 rue Principale" vs "450, Rue Principale" or a missing area code prefix can be enough.

**Why it happens:**
NAP is defined in multiple places: `site.ts` config, `location.ts` config, JSON-LD schema generation in `seo.ts`, and the visible footer/contact components. These can drift as configs are updated. Secondary tenants have config TODOs — when those are filled in for the first time, whoever fills them may format the address differently than the GBP listing.

**How to avoid:**
- Single source of truth: NAP must flow from one canonical config object (`location.ts` per tenant). Schema, footer, and all components must read from that object — never hardcoded strings in component JSX.
- Establish an explicit NAP format spec per tenant (exact business name including accents, standardized address format, phone with area code and consistent punctuation) and write it into `location.ts` comments.
- After filling any tenant config TODO, verify the GBP listing and schema-emitted values match exactly using a diffing script or manual side-by-side.
- Quarterly: use BrightLocal or Whitespark to scan directories for NAP drift caused by aggregator data updates.

**Warning signs:**
- Two versions of the business name (e.g., "Ongles Maily" vs "Ongles-Maily") appear in GBP vs the site footer.
- Phone number in `LocalBusiness` schema uses dashes while GBP uses dots.
- GSC local panel shows address that differs from what JSON-LD emits.
- Near-me searches show the salon card with a different address than the website.

**Phase to address:** Phase 1 (complete per-tenant config). NAP must be locked before schema audit; schema audit must include NAP parity check.

---

### Pitfall 6: Blocking AI Crawlers — Unintentional Citation Blackout

**What goes wrong:**
AI answer engines (ChatGPT/GPTBot, Claude/ClaudeBot, Perplexity/PerplexityBot, Gemini/Google-Extended) cannot cite content they cannot crawl. A `robots.txt` `Disallow: /` for any of these bots, or a CDN-level block (Cloudflare changed its AI bot blocking default — it now blocks by default if configured with Bot Fight Mode), causes a complete information blackout for that AI engine. The salon will not be cited in answer responses even for direct name searches.

**Why it happens:**
Defensive `robots.txt` configurations copied from templates block all non-Google crawlers. CDN bot-fight rules added without reviewing which bots are affected. The Dokploy/Docker deployment may have nginx or CDN rules that silently block user-agents matching "bot."

**How to avoid:**
- `robots.txt` must explicitly allow `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, and `anthropic-ai`.
- Verify CDN/proxy (if Cloudflare is in use) has AI crawlers not in the blocked bot list.
- After any `robots.txt` or CDN rule change, test each bot user-agent with `curl -A "GPTBot" https://tenant.com/` and confirm 200 response.
- Add `robots.txt` content to monitoring — alert if it changes unexpectedly.

**Warning signs:**
- `robots.txt` contains `Disallow: /` under any bot group that includes GPTBot/ClaudeBot.
- Cloudflare Bot Fight Mode or Super Bot Fight Mode is enabled without AI crawler exclusions.
- AI crawl activity is absent from server logs even weeks after content publication.
- The salon is not cited in Perplexity or ChatGPT responses for "nail salon [city name]" queries despite ranking organically.

**Phase to address:** Phase 1 (robots.txt + CDN audit before any content work, to unblock crawlers before content is published).

---

### Pitfall 7: llms.txt Misuse — Marketing Copy Instead of Factual Structured Context

**What goes wrong:**
`llms.txt` is filled with marketing language ("We are an innovative beauty destination"), outdated pricing/services, or is a dump of the full homepage copy. AI systems parsing the file extract no useful, specific facts. Worse, if `llms.txt` links to pages blocked in `robots.txt`, some crawlers deprioritize or ignore the entire file. The standard is not officially supported by Google (as of Dec 2025, a Google-authored `llms.txt` was added then removed the same day), so over-investment in it at the expense of page-level factual content is a misallocation.

**Why it happens:**
Teams treat `llms.txt` as a marketing asset rather than a structured fact sheet. Multi-tenant sites create one `llms.txt` at the root that describes neither tenant accurately. The file is written once and never updated as services/pricing/hours change.

**How to avoid:**
- Per-tenant `llms.txt` (or tenant-specific sections) with only factual, specific content: exact business name, address, phone, hours, service categories with price ranges, booking URL, languages spoken.
- No marketing language. No superlatives. Short declarative sentences optimized for factual extraction.
- `llms.txt` must be updated every time service offerings or prices change — treat it as a changelog artifact.
- Verify all links in `llms.txt` resolve with 200 and are not blocked in `robots.txt`.
- Prioritize substantive page content (FAQ, service pages, pricing pages) over `llms.txt` polish; AI engines primarily crawl pages, not `llms.txt`.

**Warning signs:**
- `llms.txt` contains phrases like "premier destination" or "innovative" without specific facts.
- `llms.txt` references a service or price that no longer exists or has changed.
- `llms.txt` is identical for all tenants except the business name swap.
- A URL in `llms.txt` returns 404 or is `Disallow`ed in `robots.txt`.

**Phase to address:** Phase 2 (GEO content depth); `llms.txt` polish is low-ROI until substantive page content exists.

---

### Pitfall 8: AI Referral Traffic Mis-Attribution — Invisible ROI

**What goes wrong:**
AI-driven traffic (from ChatGPT, Perplexity, Claude, Gemini) arrives without referrer headers in 35–70% of sessions and lands in GA4 as "Direct." GA4's native AI Assistant channel (launched May 2026) captures only sessions with intact referrer headers and misses Perplexity entirely. Without a custom channel group with regex filters covering all AI domains (positioned above the Referral rule), you cannot measure whether GEO efforts are working. Teams then either abandon GEO (thinking it generates no traffic) or cannot make data-driven decisions about which content to expand.

**Why it happens:**
GA4's default channel grouping predates AI referrals. The native AI Assistant channel has limited platform coverage and is not retroactive. Most GA4 setups in brownfield projects predate mid-2026 and have no AI referral segment.

**How to avoid:**
- Enable/verify GA4 native AI Assistant channel (automatic as of June 2026 rollout; confirm it appears in Channel Grouping).
- Create a custom GA4 channel group with regex matching `chatgpt.com|perplexity.ai|claude.ai|gemini.google.com|bing.com/chat|copilot.microsoft.com|grok.x.com|deepseek.com` — position this rule above Referral in evaluation order.
- Add a GA4 custom event for booking CTA clicks segmented by channel group, to connect AI traffic to conversion.
- Supplement with server log analysis for sessions without client-side referrer.
- For Google AI Overviews: use Search Console AI Mode filter (available since June 2025) — this is the only source for that signal.
- Do not report "AI traffic converts X times better" from industry studies; measure it on the actual tenant properties.

**Warning signs:**
- Direct traffic spikes in GA4 coincide with a new piece of content published and promoted in AI-optimized format.
- GA4 has no "AI Assistant" channel group at all.
- Perplexity referrals land under "Referral" without a dedicated segment catching them.
- Booking form submissions that should be attributable to ChatGPT citation all show `(direct) / (none)`.

**Phase to address:** Phase 4 (measurement, cross-cutting) — must be set up before GEO content launches so attribution data accumulates from day one.

---

### Pitfall 9: Over-Optimizing for AI at the Cost of Human Conversion

**What goes wrong:**
Pages are restructured to lead with answer blocks and FAQ-heavy content for AI extractability, but this removes the emotional/visual trust signals (before/after photos, staff introductions, video testimonials) that convert a human visitor. Conversion rates drop even as AI citation rates improve. The salon wins citations but loses bookings.

**Why it happens:**
GEO optimization advice ("lead with the answer," "short factual blocks," "direct answer patterns") is technically correct for AI extraction but mechanically applied to pages that serve high-intent human visitors who need persuasion, not just information.

**How to avoid:**
- The booking CTA must remain above the fold and reachable within one scroll regardless of content restructuring.
- Answer-lead content pattern: open with a factual sentence, then immediately provide a booking action. Do not bury the CTA after 600 words of factual content.
- Keep trust signals (photos, reviews, staff names) visible on the page even when wrapping factual content in structured blocks for AI extraction.
- A/B test new GEO-optimized page variants against conversion baseline before fully replacing existing pages.
- Never remove visible review content or staff photos in favour of "clean" text-only layouts.

**Warning signs:**
- Booking form submissions per 1000 sessions drops after a content restructuring.
- Above-the-fold viewport on mobile shows only text blocks with no booking action visible.
- Session duration increases (more time reading) but conversion rate decreases (not acting).

**Phase to address:** Phase 3 (GEO content creation) — conversion hardening must be verified alongside every new page pattern.

---

### Pitfall 10: CWV/INP Regressions from Added Scripts and Schema

**What goes wrong:**
Adding third-party analytics scripts (GA4 custom events, heatmap tools, chat widgets) during the measurement phase, or emitting very large JSON-LD blocks per page, degrades Core Web Vitals. INP (Interaction to Next Paint) is particularly sensitive to third-party JavaScript executing on the main thread during user interaction. A regression from INP ≤ 200ms to > 200ms (poor) can cause ranking decline and directly harm mobile bookings (the primary booking surface for a nail salon).

**Why it happens:**
JSON-LD schema is server-rendered in this Next.js setup and is passive data — it poses minimal INP risk. The real risk is executable scripts: GA4 custom event listeners, booking widget scripts (`WidgetEmbed.tsx` uses imperative `useEffect` + script injection), and any marketing scripts loaded via the admin panel's `CustomCodeHost`. These scripts have zero test coverage per `CONCERNS.md` and can block interaction if loaded without proper `next/script` strategy.

**How to avoid:**
- All third-party scripts must use `next/script` with `strategy="lazyOnload"` (analytics, chat, heatmaps) or `strategy="afterInteractive"` (booking widget) — never synchronous `<script>` tags.
- Measure CWV (especially INP and LCP) with Lighthouse CI on a per-tenant basis before and after each script addition.
- `CustomCodeHost` (admin-injected scripts) must be loaded with `lazyOnload` and sandboxed from interaction paths.
- WidgetEmbed script injection should not execute on pages where the widget is not visible (guard with intersection observer or route matching).
- Target: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 in field data (CrUX). Add Lighthouse CI to the Dokploy deploy pipeline to catch regressions before production.
- JSON-LD schema size: keep each page's combined JSON-LD under 50KB. Large nested schemas (Organization + LocalBusiness + Service + FAQ all on homepage) can cause measurable LCP delay in parse-heavy environments.

**Warning signs:**
- PageSpeed Insights INP for any tenant page exceeds 200ms (poor threshold) after adding measurement scripts.
- CrUX data shows LCP regression within 28 days of a deploy that added new scripts.
- Lighthouse CI score for a tenant drops > 10 points between deploys.
- WidgetEmbed loads booking widget scripts on pages that don't show the widget (wasted parse time).

**Phase to address:** Phase 4 (measurement setup) is the highest risk point; monitor CWV as a success criterion for every phase that adds scripts or schema.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Emit `aggregateRating` from stub `google-reviews.json` | Stars appear in SERPs faster | Schema-content mismatch → manual action risk | Never in production |
| Copy service descriptions verbatim across tenants | Faster config completion | Silent filtering of secondary tenants from local SERPs | Never; must differentiate |
| Single root `llms.txt` for all tenants | One file to maintain | AI context is inaccurate for any tenant except the "default" | Never; must be per-tenant |
| Point secondary-tenant hreflang to primary-tenant canonical | Avoids managing multiple canonicals | EN locale loses independent ranking; hreflang silently ignored | Never |
| Use `strategy="beforeInteractive"` for analytics | Ensures events fire on all pages | Blocks hydration, INP regression on mobile | Never |
| Leave `robots.txt` with catch-all `Disallow` for bots | Reduces scraper traffic | Blocks all AI crawlers, zero GEO citations | Never for AI crawlers |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Business Profile | GBP address format diverges from `location.ts` config | Define NAP in `location.ts` as canonical; copy exact string to GBP — no reformatting |
| GA4 AI channel | Relying solely on native AI Assistant channel | Layer custom channel group regex above Referral rule; native channel misses Perplexity and dark traffic |
| `google-reviews.json` fetch script | Manual execution before schema is emitted | Integrate into pre-build pipeline; guard schema emission on `fetchedAt` non-null + `reviewCount >= 5` |
| `WidgetEmbed` third-party scripts | Scripts loaded synchronously via `useEffect` without `next/script` | Refactor to `next/script strategy="afterInteractive"` with proper cleanup |
| hreflang in `<head>` + sitemap | Both methods used simultaneously with diverging URLs | Choose one method (head link tags for this site's scale); remove the other |
| Cloudflare / CDN bot rules | Bot Fight Mode silently blocks AI crawlers | Whitelist GPTBot, ClaudeBot, PerplexityBot, Google-Extended explicitly in CDN bot rules |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Large JSON-LD on homepage (Organization + LocalBusiness + multiple Services + FAQ) | LCP delay on slow mobile connections | Cap total JSON-LD per page to ~50KB; move Service schema to service pages only | At > 10 service schema items on one page |
| Admin-injected custom code via `CustomCodeHost` without script strategy | INP regression; layout shifts | Load injected scripts via `lazyOnload`; add CSP to restrict inline execution | On any admin config save that adds marketing scripts |
| WidgetEmbed loads scripts on non-widget routes | Wasted parse time on every page | Guard script injection with route check; use intersection observer | On any route that does not render the booking widget |
| Supabase calls without `unstable_cache` | N+1 fetches per tenant route; slow TTFB | Verify `unstable_cache` wrapping is consistent across all store config reads | Under concurrent tenant request load |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Admin-authored `CustomCodeHost` scripts without CSP | XSS if admin account is compromised; runs on all visitor pages | Add `Content-Security-Policy` header restricting script-src to known domains; require hash validation for inline scripts |
| `robots.txt` allowing all bots including malicious scrapers with no rate limit | Content theft, server load | Whitelist AI crawlers explicitly; rate-limit via nginx or CDN; do not `Allow: /` globally |
| `google-reviews.json` with stale credentials silently serving stub data | Misleading schema content; potential manual action | Add startup warning when `fetchedAt` is null or > 90 days old; alert via Resend email or log |
| Tenant resolution failure silently serving wrong tenant content | Cross-tenant data leak in config or schema | Add startup validation asserting `TENANT` env var matches `TENANT_REGISTRY`; throw on mismatch |

---

## "Looks Done But Isn't" Checklist

- [ ] **Schema audit:** Schema emitted from stub/placeholder data — verify all `aggregateRating` values in JSON-LD match `google-reviews.json` `fetchedAt` non-null output.
- [ ] **hreflang reciprocity:** Every locale page lists all other locales — verify by fetching each alternate URL and confirming the return hreflang annotation includes the source page.
- [ ] **robots.txt AI crawlers:** File allows GPTBot, ClaudeBot, PerplexityBot — verify with `curl -A "GPTBot"` returning 200.
- [ ] **NAP parity:** Footer NAP, JSON-LD `address`, and GBP listing match exactly for each tenant — verify by diffing programmatically.
- [ ] **GA4 AI channel:** Custom channel group exists with AI domain regex positioned above Referral rule — verify in GA4 Admin > Channel Groups.
- [ ] **INP baseline:** Lighthouse CI reports INP ≤ 200ms for all tenant homepages before script additions in measurement phase.
- [ ] **Tenant content uniqueness:** Each tenant service page first 150 words are unique — verify with a similarity diff script (target < 30% sentence overlap between tenants).
- [ ] **llms.txt accuracy:** File contains no marketing language and links only to 200-status, robots.txt-allowed URLs — verify programmatically on each deploy.
- [ ] **Canonical self-reference:** Each locale page canonicalizes to itself, not cross-locale — verify with curl + grep on canonical `<link>` tags.
- [ ] **Secondary tenant schema guard:** Tenants with config TODOs outstanding do not emit `aggregateRating` or `Review` schema — verify by building secondary tenant locally and inspecting JSON-LD output.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schema-content mismatch manual action | MEDIUM | Fix mismatch in source data; submit reconsideration request via Search Console; wait 2–4 weeks for review |
| Fake/stub review schema manual action | HIGH | Remove all `Review`/`aggregateRating` schema site-wide; fix underlying data source; reconsideration request; rebuild trust over months |
| Tenant pages silently filtered (duplicate content) | MEDIUM | Write unique location-specific copy for affected tenant pages; allow 4–8 weeks for re-indexing and filtering reversal |
| hreflang misconfiguration (EN locale not indexed) | LOW–MEDIUM | Correct canonical and hreflang annotations; force re-crawl via Search Console URL Inspection; 1–4 week reversal |
| AI crawlers blocked (citation blackout) | LOW | Update robots.txt + CDN rules; crawlers will re-discover within 1–2 weeks; citation recovery takes longer |
| CWV INP regression from added scripts | MEDIUM | Roll back offending script to previous load strategy; verify CWV improvement in field data (28-day CrUX lag) |
| AI traffic mis-attributed (no measurement data) | LOW (forward-only) | Implement custom GA4 channel group; no retroactive data recovery for native channel |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Schema-content mismatch | Phase 1 (config completion + reviews integration) | Rich Results Test passes; schema values match visible content |
| Fake/stub review schema | Phase 1 (reviews fetch integration) | JSON-LD `ratingValue` equals `google-reviews.json` `ratingValue`; `fetchedAt` non-null |
| Duplicate content across tenants | Phase 1 (per-tenant copy) + Phase 3 (content depth) | Similarity diff < 30% sentence overlap between tenant service pages |
| hreflang/canonical conflicts | Phase 2 (technical SEO audit) | All locale pages self-canonical; hreflang reciprocity verified by crawl |
| NAP inconsistency | Phase 1 (config completion) | Programmatic diff of `location.ts` vs GBP vs JSON-LD vs footer for each tenant |
| AI crawlers blocked | Phase 1 (robots.txt + CDN audit) | `curl -A "GPTBot"` returns 200 for each tenant domain |
| llms.txt misuse | Phase 2 / Phase 3 (GEO content) | llms.txt contains no marketing language; all links return 200 and are robots-allowed |
| AI traffic mis-attribution | Phase 4 (measurement setup) | GA4 custom AI channel group exists and positioned above Referral; test with known AI referral session |
| Human conversion degradation | Phase 3 (GEO content creation) | Booking CTA above fold on mobile; conversion rate not regressed vs pre-GEO baseline |
| CWV/INP regression | Phase 4 (measurement) monitored every phase | Lighthouse CI in deploy pipeline; INP ≤ 200ms, LCP ≤ 2.5s for all tenant homepages |

---

## Sources

- Google Search Central — [General Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- Google Search Central — [Review Snippet Structured Data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- Blue Array SEO — [Spammy structured data markup / AggregateRating](https://www.bluearray.co.uk/news/schema/spammy-structured-data-markup-review-aggregaterating-schema/)
- BrightLocal — [Can local businesses use review schema?](https://www.brightlocal.com/learn/review-schema/)
- Rio SEO — [Duplicate content on multi-location brands](https://www.rioseo.com/blog/the-effect-of-duplicate-content-on-seo-for-multi-location-brands/)
- Sterling Sky — [Service area pages with duplicate/similar content](https://www.sterlingsky.ca/service-area-pages-duplicate-content/)
- Scale Local Content — [Duplicate content on multi-location websites](https://scalelocalcontent.com/blog/duplicate-content-multi-location-websites.html)
- Search Engine Journal — [Common hreflang mistakes](https://www.searchenginejournal.com/ask-an-seo-what-are-the-most-common-hreflang-mistakes/556455/)
- SEOlogist — [Hreflang canonical conflicts](https://www.seologist.com/knowledge-sharing/canonical-hreflang/)
- LinkGraph — [Hreflang implementation guide 2026](https://www.linkgraph.io/blog/hreflang-implementation-guide/)
- Hashmeta — [Multilingual hreflang mistakes](https://hashmeta.com/blog/why-multilingual-hreflang-mistakes-destroy-rankings-the-hidden-seo-crisis/)
- Organik PI — [Track AI search referrals in GA4](https://organikpi.com/blog/technical-seo/ga4-ai-search-referral-attribution/)
- Digital Applied — [GA4 AI Assistant channel 2026](https://www.digitalapplied.com/blog/ga4-ai-assistant-channel-2026-measure-ai-traffic-playbook)
- The Digital Bloom — [Gen AI website traffic share Feb 2026](https://thedigitalbloom.com/learn/gen-ai-website-traffic-share-february-2026/)
- Next.js Documentation — [next/script and INP optimization](https://nextjs.org/docs/app/guides/scripts)
- Incremys — [llms.txt complete guide 2026](https://www.incremys.com/en/resources/blog/llms-txt)
- DEV Community — [llms.txt guide for 2026](https://dev.to/lab451/complete-llmstxt-guide-for-2026-57d)
- Digital Applied — [Schema markup after March 2026](https://www.digitalapplied.com/blog/schema-markup-after-march-2026-structured-data-strategies)

---
*Pitfalls research for: Multi-tenant local-service (nail salon) — SEO + GEO optimization*
*Researched: 2026-06-17*
