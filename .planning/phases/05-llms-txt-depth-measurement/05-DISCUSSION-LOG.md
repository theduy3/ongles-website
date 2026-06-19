# Phase 5: llms.txt Depth + Measurement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-19
**Phase:** 5-llms.txt Depth + Measurement
**Areas discussed:** GA4 setup model, Conversion definition, llms.txt depth & scope, Conversion surface UI

---

## GA4 setup model — property mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Per-tenant property | Each tenant its own GA4 property; measurement ID per-tenant in config; clean separate reporting/ownership | ✓ |
| One shared property | Single property, tenant as custom dimension; one ID but co-mingled data | |

**User's choice:** Per-tenant property
**Notes:** Rationale — each salon is a separate legal business on one Docker image; per-tenant property lets each owner be granted access to only their own data.

## GA4 setup model — consent (Québec Law 25)

| Option | Description | Selected |
|--------|-------------|----------|
| Consent Mode v2, denied-by-default | Cookieless pings until consent via banner; flips on accept; Law-25 defensible | ✓ |
| Hard gate behind banner | No GA4 at all until accept; zero pre-consent data | |
| Load unconditionally | Simplest, non-compliant with Law 25; not recommended | |

**User's choice:** Consent Mode v2, denied-by-default
**Notes:** Needs a lightweight net-new consent banner + gtag consent calls.

---

## Conversion definition — events

| Option | Description | Selected |
|--------|-------------|----------|
| Call click (tel:) | Phone link clicks; strongest local-intent | ✓ |
| Book-online click | Opens booking; intent only (completion is in 3rd-party iframe) | ✓ |
| Contact form submit | ContactForm successful submit; real lead | ✓ |
| Directions click | Map/get-directions link | ✓ |

**User's choice:** All four
**Notes:** Booking completion not trackable cross-origin — only click/intent.

## Conversion definition — primary key event

| Option | Description | Selected |
|--------|-------------|----------|
| Book-online click | Closest proxy to revenue; primary GA4 key event | ✓ |
| Call click | If phone bookings dominate | |
| All equal, no primary | Weaker optimization signal | |

**User's choice:** Book-online click (primary); others secondary.

---

## llms.txt depth & scope — content

| Option | Description | Selected |
|--------|-------------|----------|
| Service list + price ranges | 4 services + CAD ranges, generated from config | ✓ |
| Hours + booking path | Generated from config | ✓ |
| New Phase-4 pages | Link pricing/comparison/near-me | ✓ |
| Hand-authored intro prose | Per-tenant llmsDescription (replaces leaked blockquote) | ✓ |

**User's choice:** All four
**Notes:** Split = generated facts (stay in sync) + one hand-authored intro paragraph (>200 words differentiator).

## llms.txt depth & scope — locale

| Option | Description | Selected |
|--------|-------------|----------|
| FR canonical + EN listed | FR default pages + "English equivalents" section | ✓ |
| FR canonical only | FR only, deepened; engines follow hreflang | |

**User's choice:** FR canonical + EN equivalents
**Notes:** Use `site.canonicalUrl` (I-01), not `site.url`.

---

## Conversion surface UI — sticky CTA (CONV-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep pill, verify mobile | Keep existing FloatingCTA; verify above-fold mobile + instrument clicks | ✓ |
| Full-width mobile bar | Replace pill with full-width sticky bar; net-new component | |
| Pill + full-width bar on key pages | Both; most aggressive | |

**User's choice:** Keep pill, verify mobile
**Notes:** FloatingCTA already mounted site-wide in layout.tsx — this is verify + instrument, not build.

## Conversion surface UI — above-fold signals (CONV-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Star rating + review count | AggregateRating near hero; gated on R-02 (≥5 fresh reviews) | ✓ |
| Years-experience badge | '15+ years'; always available | ✓ |
| Price-from anchor | 'À partir de $X' → pricing page; D-29 compliant | ✓ |

**User's choice:** All three

## Conversion surface UI — target pages

| Option | Description | Selected |
|--------|-------------|----------|
| Home | Primary landing | ✓ |
| Service detail pages | /services/[slug], high intent | ✓ |
| Pricing page | /tarifs · /pricing | ✓ |
| Comparison + near-me | Phase-4 buying-guide pages (lighter treatment) | ✓ |

**User's choice:** All four (home/service/pricing primary; comparison+near-me lighter).

---

## Claude's Discretion

- LOCAL-01 (not separately selected) — captured as N-01 (single-config-source + consistency guard) and N-02 (documented NAP reference for external alignment); off-site profile creation deferred.
- GA4 loading mechanism (`next/third-parties` vs hand-rolled `<Script>`), consent-banner UX/persistence/copy, config field names + completeness-guard wiring, llms.txt markdown structure, leak-guard test placement, GA4 event-payload shapes, exact above-fold markup, N-02 artifact format, AI-Assistant vs Perplexity-regex channel grouping (GA4-console manual step).

## Deferred Ideas

- GBP/external directory profile creation + off-site link-building (marketing-ops).
- Full-width mobile sticky bar (rejected in favor of FloatingCTA pill).
- Tracking booking completion inside the third-party widget (cross-origin limit).
- Server-side / Measurement Protocol conversion tracking.
- ES-locale llms.txt / pages.
- Dedicated RUM tooling beyond GA4 web-vitals events.
