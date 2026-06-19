# Phase 04 — Net-New Pages: Consolidated UAT Manifest

> Phase-closing verification guide. Covers all 5 waves (04-01 through 04-05).
> Automated gates are green at merge time. Manual gates are post-deploy spot-checks.

---

## Phase Success Criteria

From ROADMAP.md Phase 4:

| # | Success Criterion | Status |
|---|-------------------|--------|
| SC1 | `/[lang]/tarifs` (FR) + `/[lang]/pricing` (EN) exists per tenant, renders pricing as HTML table, emits ItemList + AggregateOffer JSON-LD | **AUTOMATED GREEN** (build guard + ItemList test); Google Rich Results: **manual post-deploy** |
| SC2 | ≥2 comparison pages per tenant, ≥200 words unique copy, direct-answer AnswerBlock | **AUTOMATED GREEN** (checkWordCount + checkComparisonAnswerBlockPresence) |
| SC3 | Near-me pages per tenant, ≥150 words unique copy, <30% sentence overlap cross-tenant | **AUTOMATED GREEN** (checkWordCount + checkCrossTenantOverlap) |
| SC4 | All new routes in sitemap.ts, reachable FR + EN without 404 | **AUTOMATED** (sitemap localizedPageEntries + checkRoutePresence); route-reachability: **manual post-deploy** |

---

## Automated Gates — All Green at Merge

Run these from the project root (not worktree — build runs on main after merge):

```bash
# Unit + guard suite (355 tests, ~200ms)
bun test src/

# Build guard — fires on word-count / overlap / route-presence / answerBlock violations
TENANT=ongles-maily bun run build
TENANT=ongles-charlesbourg bun run build
TENANT=ongles-rivieres bun run build
```

### Guard inventory (all wired in `validateSchemaInvariants()`):

| Guard | Invariant code | What it checks | Phase wired |
|-------|---------------|----------------|-------------|
| `checkWordCount` | P4-wordcount | comparison body ≥200 words per slug per tenant per locale | 04-03/04-04 |
| `checkWordCount` | P4-wordcount | nearMe answerBlock ≥150 words per tenant per locale | 04-03 |
| `checkCrossTenantOverlap` | P4-overlap | Jaccard sentence overlap <30% on nearMe answerBlock across tenant pairs | 04-03 |
| `checkComparisonAnswerBlockPresence` | D-11 | comparison answerBlock ≥2 sentences per slug per tenant per locale | 04-04 |
| `checkRoutePresence` | P4-route | borough near-me slug in site.routes per tenant | 04-05 |
| `checkAnswerBlockPresence` | D-11 | home/services/locations/service answerBlock ≥2 sentences | Phase 3 |
| `checkFaqFloor` | D-05 | merged FAQ ≥20 items per tenant per locale | Phase 3 |

---

## SC1 — Pricing Page (PAGE-01)

### Automated (green now)
- `bun test src/` includes ItemList shape test: `servicesGraph()` emits `@type: ItemList` with per-item `AggregateOffer` (lowPrice / highPrice from service config)
- `bun run build` build guard passes: pricing page exists at `/[lang]/tarifs` (FR) and `/[lang]/pricing` (EN) with AnswerBlock ≥2 sentences
- `sitemap.ts` localizedPageEntries block emits `/fr/tarifs` ↔ `/en/pricing` pair with correct hreflang alternates (`fr`/`en`/`x-default`)

### Manual (post-deploy)
1. **Google Rich Results Test** — paste `https://{tenant-domain}/fr/tarifs` into https://search.google.com/test/rich-results
   - Expected: ItemList + Service/AggregateOffer, no errors, no warnings
   - Fallback: paste raw HTML if domain not yet indexed

2. **Route reachability**
   ```bash
   curl -sI https://{tenant-domain}/fr/tarifs  | grep "HTTP/"   # expect 200
   curl -sI https://{tenant-domain}/en/pricing | grep "HTTP/"   # expect 200
   curl -sI https://{tenant-domain}/en/tarifs  | grep "HTTP/"   # expect 404 (wrong-locale guard)
   curl -sI https://{tenant-domain}/fr/pricing | grep "HTTP/"   # expect 404 (wrong-locale guard)
   ```

3. **Sitemap check**
   ```bash
   curl -s https://{tenant-domain}/sitemap.xml | grep -E "tarifs|pricing"
   # Expect: /fr/tarifs and /en/pricing entries; NO /en/tarifs or /fr/pricing
   ```

4. **Header nav** — load homepage, confirm "Tarifs" (FR) / "Pricing" (EN) appear in nav and click through to the correct locale route (not an anchor scroll)

---

## SC2 — Comparison Pages (PAGE-02)

### Automated (green now)
- `checkWordCount`: all 4 comparison slugs x 3 tenants x 2 locales have body ≥200 words
- `checkComparisonAnswerBlockPresence`: all 4 slugs x 3 tenants x 2 locales have answerBlock ≥2 sentences
- Routes exist: `src/app/[lang]/comparaisons/[slug]/page.tsx` (FR) + `src/app/[lang]/comparisons/[slug]/page.tsx` (EN)
- Sitemap: `localizedPageEntries` emits all 4 FR/EN comparison pairs with hreflang

### Manual (post-deploy)
1. **Visual DOM check** (one tenant, both locales)
   - Visit `/fr/comparaisons/pose-vs-remplissage` — expect: AnswerBlock h1, ≥200-word body, cross-links to related services, CTA row
   - Visit `/en/comparisons/nail-extensions-vs-fill` — expect: idiomatic EN copy, same structure

2. **Route reachability (all 4 comparison slugs, FR + EN)**
   ```bash
   for slug_fr in pose-vs-remplissage manucure-vs-pedicure gel-vs-acrylique meilleur-pour; do
     curl -sI "https://{tenant-domain}/fr/comparaisons/${slug_fr}" | grep "HTTP/"
   done
   for slug_en in nail-extensions-vs-fill manicure-vs-pedicure gel-vs-acrylic best-for; do
     curl -sI "https://{tenant-domain}/en/comparisons/${slug_en}" | grep "HTTP/"
   done
   # All expect 200
   ```

3. **Header nav** — "Comparatifs" (FR) / "Comparisons" (EN) in nav, links to pose-vs-remplissage / nail-extensions-vs-fill as lead entry

### Open human-review item — ComparisonColumns component deferral

**Decision required before phase close:**

Wave 4 comparison pages render answer-first (AnswerBlock h1 + ≥200-word body + cross-links + CTA). The `ComparisonColumns` two-column card component exists in the codebase but is NOT wired into the comparison page layout. The `pages.comparison` data model carries no per-side `{name, descriptor, bullets}` content, and only 2 of 4 comparisons map to two distinct services.

SC2 measurable success criterion (answer-first ≥200-word unique copy FR+EN + schema) IS met.

**Gate question:** Are two-column comparison cards required before this phase closes?
- **If NO:** the current answer-first layout is the final design. Close this gate by marking it resolved.
- **If YES:** author per-side `{name, descriptor, bullets}` content in `seo.{fr,en}.json` for the 2 applicable comparisons, wire `ComparisonColumns` in `src/app/[lang]/comparaisons/[slug]/page.tsx`, re-run guards.

---

## SC3 — Near-Me Borough Pages (PAGE-03)

### Automated (green now)
- `checkWordCount`: all 3 tenants x 2 locales have nearMe answerBlock ≥150 words
- `checkCrossTenantOverlap`: Jaccard pairwise overlap <30% on all 3 tenant pairs per locale
- Routes in `site.routes` per tenant (checked by `checkRoutePresence`)

### Manual (post-deploy)

#### Ongles Maily — /beauport
```bash
# Visit with TENANT=ongles-maily (or on live domain):
http://localhost:3000/fr/beauport
http://localhost:3000/en/beauport
```
Expected:
- h1 names Beauport (not generic "Quebec")
- Opening paragraph ≥150 words, mentions Carrefour Beauport, rue du Carrefour, autoroute Felix-Leclerc, Giffard/Montmorency neighbourhoods
- NAP/landmark panel: address Carrefour Beauport, phone (418) 660-8228, hours by day
- Book CTA + Call CTA + Locations link
- NOT present in header navigation

#### Ongles Charlesbourg — /charlesbourg
```bash
http://localhost:3000/fr/charlesbourg
http://localhost:3000/en/charlesbourg
```
Expected:
- h1 names Charlesbourg
- Copy mentions Henri-Bourassa corridor, Carrefour Charlesbourg, Laurentides/Trait-Carre — clearly different from Beauport
- NAP shows 8500 boulevard Henri-Bourassa, Quebec, QC G1G 5X1, phone (581) 981-8228
- Guard-verified: Jaccard overlap with Beauport FR copy = 0.000

#### Ongles Rivieres — /trois-rivieres
```bash
http://localhost:3000/fr/trois-rivieres
http://localhost:3000/en/trois-rivieres
```
Expected:
- h1 names Trois-Rivieres
- Copy mentions Centre Les Rivieres, boulevard des Forges, Vieux-Trois-Rivieres, Cap-de-la-Madeleine — different city from both Quebec tenants
- NAP shows 4225 boulevard des Forges, Trois-Rivieres, QC G8Y 1W2, phone (819) 378-8228

#### Nav exclusion (all tenants)
Header on all 3 tenants: /beauport, /charlesbourg, /trois-rivieres must NOT appear as nav links.

---

## SC4 — Sitemap Coverage + Route Reachability (PAGE-01/02/03)

### Automated (green now)
- `checkRoutePresence()`: borough near-me slug in `site.routes` per tenant — wired, green
- `sitemap.ts` `localizedPageEntries` block: emits pricing pair + 4 comparison pairs (10 entries per locale run)
- Borough routes emitted via `pageEntries` (from `site.routes`) in both locales

### Manual (post-deploy)

1. **Sitemap XML coverage**
   ```bash
   curl -s https://{tenant-domain}/sitemap.xml | grep -cE "tarifs|pricing|comparaisons|comparisons|beauport"
   # Expect count >= 12 (2 pricing + 8 comparison FR+EN + 2 borough FR+EN)

   # Verify NO wrong-locale leaks:
   curl -s https://{tenant-domain}/sitemap.xml | grep -E "en/tarifs|fr/pricing"
   # Expect: empty (no wrong-locale entries)
   ```

2. **Hreflang alternates** — view sitemap XML, confirm each pricing/comparison entry has:
   - hreflang="fr" pointing to /fr/tarifs
   - hreflang="en" pointing to /en/pricing
   - hreflang="x-default" pointing to /fr/tarifs

3. **Smoke test — 200 on all new routes (run on live domain)**
   ```bash
   # Pricing
   curl -sI https://{tenant-domain}/fr/tarifs  | grep "HTTP/"   # 200
   curl -sI https://{tenant-domain}/en/pricing | grep "HTTP/"   # 200
   # Comparisons FR
   for s in pose-vs-remplissage manucure-vs-pedicure gel-vs-acrylique meilleur-pour; do
     curl -sI "https://{tenant-domain}/fr/comparaisons/$s" | grep "HTTP/"
   done
   # Comparisons EN
   for s in nail-extensions-vs-fill manicure-vs-pedicure gel-vs-acrylic best-for; do
     curl -sI "https://{tenant-domain}/en/comparisons/$s" | grep "HTTP/"
   done
   # Borough near-me (replace domain per tenant)
   curl -sI https://onglesmaily.com/fr/beauport | grep "HTTP/"       # 200
   curl -sI https://onglesmaily.com/en/beauport | grep "HTTP/"       # 200
   ```

4. **Cross-tenant build verification**
   ```bash
   TENANT=ongles-maily bun run build && echo "maily OK"
   TENANT=ongles-charlesbourg bun run build && echo "charlesbourg OK"
   TENANT=ongles-rivieres bun run build && echo "rivieres OK"
   ```

---

## AI-Citation Spot-Check (Carry-Forward, Non-Blocking)

Same pattern as Phase 3 SC-4. After Google indexing (~2-4 weeks post-deploy):

1. Search ChatGPT / Perplexity for:
   - "[salon name] tarifs ongles Beauport"
   - "[salon name] pricing nail salon Charlesbourg"
   - "gel vs acrylique ongles Quebec"
   - "pose vs remplissage ongles Trois-Rivieres"

2. Expected: direct-answer snippets cite the salon domain; structured data appears in AI summaries.

3. Non-blocking — log results in a future phase retrospective.

---

## Wave-by-Wave Completion Summary

| Wave | Plan | Status | Key deliverables |
|------|------|--------|-----------------|
| 1 | 04-01 | DONE | Guards scaffold (checkWordCount, checkCrossTenantOverlap, checkRoutePresence), measureSentenceOverlap, pages.* JSON namespace, pricingGraph, ItemList shape test |
| 2 | 04-02 | DONE | /tarifs (FR) + /pricing (EN) pages, PricingTable, AggregateOffer schema, seo.json pricing keys, seo-parity extended |
| 3 | 04-03 | DONE | 3 borough near-me pages (beauport / charlesbourg / trois-rivieres), NearMeDetails NAP panel, word-count + overlap guards wired |
| 4 | 04-04 | DONE | 4 comparison pages (FR comparaisons + EN comparisons), comparison body >=200 words, answerBlock >=2 sentences guard wired |
| 5 | 04-05 | DONE | sitemap localizedPageEntries (pricing + 4 comparisons), checkRoutePresence wired, header nav pricing + comparisons, dictionaries parity |

---

## Resume Signal

After completing post-deploy spot-checks, reply:
- "approved" — sitemap coverage correct, nav entries correct, all new routes 200 FR+EN, Rich Results pass on /tarifs
- Or describe issues: sitemap wrong-locale leak, nav missing/near-me leaked, 404 on valid route, guard failure on secondary tenant, ComparisonColumns decision
