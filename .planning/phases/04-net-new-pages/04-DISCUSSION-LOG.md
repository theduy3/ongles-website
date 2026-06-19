# Phase 4: Net-New Pages — Discussion Log

**Date:** 2026-06-18
**Mode:** default (interactive)
**For human reference only — not consumed by downstream agents (researcher/planner/executor read CONTEXT.md).**

---

## Areas Selected for Discussion

All 4 presented gray areas selected: Route slugs & locale, Comparison topics, Near-me targeting, Pricing page format. Then 2 "explore more" rounds.

---

## Area 1 — Route slugs & locale

**Q: Locale handling for net-new slugs?**
- Options: Localized fr/en slugs *(recommended)* / Shared slug both locales
- **Selected: Localized fr/en slugs** — matches existing `slug:{fr,en}` service convention; strongest per-locale AI-citation + hreflang. → P-01

**Q: Discoverability of new pages?**
- Options: Header nav + sitemap *(recommended)* / Footer + sitemap + cross-links / Sitemap + contextual links only
- **Selected: Header nav + sitemap** → refined later (P-04: pricing+comparisons in nav, near-me as SEO landing)

## Area 2 — Comparison topics

**Q: Which comparison/decision pages to build (≥2, multiSelect)?**
- Options: Pose d'ongles vs remplissage / Manucure vs pédicure / Gel vs acrylique / Meilleur pour [occasion/durée]
- **Selected: ALL FOUR** → P-05

**Q: Does the salon offer both gel and acrylic?**
- Options: Yes — both offered / No / Not sure
- **Selected: Yes — both offered** — gel-vs-acrylique is legitimate, not fabricated. → P-06

## Area 3 — Near-me targeting

**Q: How many near-me pages per tenant + geography?**
- Options: One borough page per tenant *(recommended)* / Borough + nearby areas / Borough + generic 'near me'
- **Selected: One borough page per tenant** — Beauport / Charlesbourg / Trois-Rivières; borough not shared city, avoids the two Québec tenants cannibalizing. → P-10

**Q: Authoring model for <30% overlap?**
- Options: Hand-authored per tenant *(recommended)* / Template + per-tenant facts
- **Selected: Hand-authored per tenant** → P-11

## Area 4 — Pricing page format

**Q: Layout?**
- Options: Responsive table *(recommended)* / Cards-tiles / Grouped list
- **Selected: Responsive table** → P-13

**Q: Row detail beyond price?**
- Options: Service + price range + CTA *(recommended)* / + short blurb / + duration
- **Selected: Service + price range + CTA** (price-only, no net-new data) → P-14

## Explore-more Round 1

**Q: "Meilleur pour" angle?**
- Options: Durabilité / Événement / Both in one page
- **Selected: Both in one page** → P-07

**Q: Build-guard thresholds?**
- Options: Build-blocking ROADMAP numbers *(recommended)* / Build-blocking tune-in-planning / Warn-only
- **Selected: Build-blocking, ROADMAP numbers** (≥200 comparison, ≥150 near-me, <30% overlap) → P-17

**Q: Internal linking?**
- Options: Full cross-linking *(recommended)* / Hub-and-spoke / Nav + sitemap only
- **Selected: Full cross-linking** → P-19

## Explore-more Round 2

**Q: Which page types in header nav specifically?**
- Options: Pricing + comparisons in nav, near-me as SEO landing *(recommended)* / All three in nav / Pricing only
- **Selected: Pricing + comparisons in nav; near-me as SEO landing** → P-04

**Q: Pricing-page JSON-LD shape?**
- Options: Reuse Service+AggregateOffer per row in ItemList *(recommended)* / Page-level OfferCatalog / Planner decides
- **Selected: Reuse Service+AggregateOffer per row in ItemList** → P-15

**Q: Opening-content pattern across new pages?**
- Options: All lead with AnswerBlock + fixed template *(recommended)* / AnswerBlock on comparison+near-me only / Freeform
- **Selected: All lead with AnswerBlock + fixed section template** → P-08/P-12/P-16

---

## Deferred Ideas Captured

- Per-service duration on pricing page (net-new data) — rejected this phase
- Per-row pricing blurb — rejected (keep price-only)
- Multiple near-me neighborhoods per tenant — one borough/tenant this phase
- Exact prices in non-pricing prose — stays qualitative (D-29)
- Shared (non-localized) slugs — rejected for localized
- ES-locale content — deferred v2

## Left to Claude's Discretion (research/planning)

Exact slug strings + nav labels; overlap-measurement method (threshold locked 30%); guard/test file layout; comparison side-by-side UI; "meilleur pour" occasions + composition; sitemap priority/changeFrequency; near-me route location; AnswerBlock reuse vs variant.

---

*Discussion log — Phase 4 Net-New Pages — 2026-06-18*
