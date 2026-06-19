# Phase 3: Content Depth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 3-Content Depth
**Areas discussed:** FAQ tenant scope, Answer-block authoring, Block placement/render, Brand voice, Heading/h1, LCP/hero priority, FAQ topics, Block↔FAQ overlap, ES scaffolding, Block vs meta, Internal linking, Block length ceiling, Heading structure, Per-page canonical question, Existing intro reconciliation, Block↔schema tie-in, Sentence-count method, Pricing in copy, CTA in block, FAQ answer length, FAQ ordering, EN translation bar, Per-service/loc nesting, Page-scoped FAQ, Legacy namespace

---

## FAQ tenant scope (→ D-01..D-06)

| Option | Selected |
|--------|----------|
| Hybrid: shared base + per-tenant | ✓ |
| Fully per-tenant FAQ | |
| Stay global, de-tenant the copy | |

- **Layer location:** new per-tenant `faq.{locale}.json` ✓ (vs extend seo.{locale}.json / you-decide)
- **Migration:** move tenant-facts out + de-tenant base ✓ (vs keep 11 as-is / you-decide)
- **≥20 enforcement:** hard build-guard floor ✓ (vs parity-only / you-decide)
- **Notes:** Scouting found the global `faq.items` hardcodes maily facts → cross-tenant defect; hybrid fixes it.

## Answer-block authoring (→ D-08..D-11)

| Option | Selected |
|--------|----------|
| Hand-written per-tenant in seo.{locale}.json | ✓ |
| Auto-composed from config facts | |
| Hybrid scaffold + override | |

- **Coverage:** index pages + each detail route ✓ (vs home+index only / home+detail only)
- **Presence gate:** build-guard completeness + ≥2-sentence min ✓ (vs parity-only / you-decide)

## Block placement / render (→ D-17..D-18)

| Option | Selected |
|--------|----------|
| First in `<main>`, above hero | ✓ |
| After hero, before first section | |
| Replace/lead hero copy | |

- **Render:** one shared `<AnswerBlock>`, visible prose ✓ (vs muted/compact / you-decide)

## Brand voice (→ D-21..D-24)

- **FR register:** vous (formal) ✓ (vs tu / match-existing)
- **Style:** short factual answer-first sentences ✓ (vs natural marketing prose / you-decide)
- **Voice/tenant:** shared voice, per-tenant facts ✓ (vs distinct per tenant / you-decide)

## Heading / h1 (→ D-19)

| Option | Selected |
|--------|----------|
| Block carries the h1 | ✓ |
| Hero keeps h1, block plain prose | |
| You decide | |

## LCP / hero priority (→ D-20)

| Option | Selected |
|--------|----------|
| Keep hero image priority/eager | ✓ |
| Let text be LCP, demote hero image | |
| You decide | |

## FAQ topics (→ D-04)

Selected clusters (multi): Pricing & money ✓, Service specifics ✓, Visit logistics ✓, Health & trust ✓ (all four).

## Block↔FAQ overlap (→ D-27)

| Option | Selected |
|--------|----------|
| Reinforcement OK, vary wording | ✓ |
| Strictly differentiate | |
| You decide | |

## ES locale scaffolding (→ D-25)

| Option | Selected |
|--------|----------|
| fr/en only | ✓ |
| Scaffold empty es stubs | |
| You decide | |

## Block vs meta description (→ D-08)

| Option | Selected |
|--------|----------|
| Distinct new field | ✓ |
| Reuse / derive from meta | |
| You decide | |

## Internal linking in copy (→ D-16, D-30)

| Option | Selected |
|--------|----------|
| Allow targeted inline links | ✓ |
| Plain text only | |
| You decide | |

- **Notes:** FAQ rendered answers may link, but FAQPage `acceptedAnswer.text` must stay clean text.

## Block length ceiling (→ D-12)

| Option | Selected |
|--------|----------|
| Cap 2-4 sentences / ~60 words | ✓ |
| Min only, no ceiling | |
| You decide | |

## Per-page canonical question (→ D-14)

| Option | Selected |
|--------|----------|
| Yes — fixed Q per page type | ✓ |
| Looser intent guidance | |
| You decide | |

## Existing intro reconciliation (→ D-15)

| Option | Selected |
|--------|----------|
| Block replaces existing intro | ✓ |
| Block sits above existing intro | |
| You decide | |

## Block↔schema tie-in (→ D-28)

| Option | Selected |
|--------|----------|
| Align, don't couple | ✓ |
| Feed schema from block | |
| Keep fully separate | |

## Sentence-count method (→ D-13)

| Option | Selected |
|--------|----------|
| Hand to research | ✓ |
| Simple regex now | |
| Word-count proxy only | |

## Pricing in copy (→ D-29)

| Option | Selected |
|--------|----------|
| Qualitative ranges, no hard numbers | ✓ |
| Explicit prices from config | |
| No prices in copy | |

## CTA inside block (→ D-16)

| Option | Selected |
|--------|----------|
| Pure info + 1 inline link | ✓ |
| Block ends with booking CTA | |
| You decide | |

## FAQ answer length norm (→ D-07)

| Option | Selected |
|--------|----------|
| 1-3 short sentences, answer-first | ✓ |
| Leave open | |
| You decide | |

## FAQ ordering (→ D-06)

| Option | Selected |
|--------|----------|
| High-intent first | ✓ |
| Fixed canonical order | |
| Base then tenant appended | |

## EN translation bar (→ D-24)

| Option | Selected |
|--------|----------|
| Native-quality EN, FR-authored first | ✓ |
| Functional draft-from-FR | |
| You decide | |

## Per-service/loc nesting (→ D-10)

| Option | Selected |
|--------|----------|
| Nest under existing services/locations | ✓ |
| Flat answerBlocks map by route | |
| You decide | |

## Page-scoped FAQ (→ Deferred)

| Option | Selected |
|--------|----------|
| Defer — FAQ stays on /faq | ✓ |
| In-scope — surface per-page FAQ | |
| You decide | |

## Legacy content namespace (→ D-26)

| Option | Selected |
|--------|----------|
| New layers only, avoid legacy | ✓ |
| Use legacy where it fits | |
| You decide | |

---

## Claude's Discretion

- Sentence/word-count detection method (D-13)
- Hard-vs-soft enforcement of block length ceiling (D-12)
- Per-tenant `faq.{locale}.json` loader/merge wiring
- Distribution of ~9 new FAQ items across base vs tenant layer
- Test-file layout for new guards
- Reconciling "location detail" coverage with the single locations index route

## Deferred Ideas

- Page-scoped FAQ on service/location pages (later phase)
- ES-locale content (v2)
- Exact prices in copy (Phase 4 pricing page)
- Distinct per-tenant brand voice (rejected — shared voice + per-tenant facts)
- Feeding schema descriptions from block text (rejected — align by discipline)
