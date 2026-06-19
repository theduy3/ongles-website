---
phase: 03-content-depth
plan: 03
wave: 3
status: complete
completed: 2026-06-18
tasks_completed: 3
---

# 03-03 SUMMARY — FAQ depth (CONTENT-02)

## Objective met
Each tenant's `/faq` now shows its own location/hours/booking facts plus generic
salon answers, ≥20 per locale in intent order; the cross-tenant FAQ defect
(charlesbourg/rivieres showing Maily facts) is gone.

## What changed
- **Base dict (`dictionaries/{fr,en}.json`)** de-tenanted to **9** brand-agnostic
  generic items (location/hours/booking/services-offered removed; brand names and
  the "three stations" count stripped; +2 generic Health & Trust items: dust
  extraction, sensitivity/allergy). Intro de-branded. fr/en counts equal.
- **Per-tenant `faq.{locale}.json`** authored for maily / charlesbourg / rivieres —
  **13** intent-ordered items each (location → hours → booking → logistics →
  deposit/cancellation → pricing → services), each tenant's OWN address/hours/phone,
  qualitative pricing (D-29), FR source-of-truth + idiomatic EN.
- **`/faq` page** now calls `getTenantFaq(lang)` and feeds the SAME union to both
  `faqPageGraph` (JSON-LD) and `<Accordion>` (F-01). PageHeader h1 retained.

## Verification
- Base: no `Ongles Maily` / `Carrefour Beauport` leak; fr/en = 9/9.
- Union = **22/22** per tenant per locale (≥20 floor + buffer).
- `D-05` floor → GREEN (6); `faqPageGraph` count → GREEN (3); seo-parity → 26 GREEN.
- Full suite 234 pass; only D-11 still RED (filled by 03-04). `bun run build` green.
- `src/lib/seo.ts` untouched (D-28).

## Deviations
- **No inline FAQ links.** Links are an optional ceiling (D-16); the base FAQ uses
  plain-text references and static JSON can't safely interpolate locale-prefixed
  hrefs. Omitted consistently so fr/en parity holds. The Accordion link feature
  (03-02) remains available.

## Commits
- `4053f28` de-tenant base + per-tenant faq content
- `ffa0885` wire /faq to getTenantFaq union
