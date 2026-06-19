---
phase: 03-content-depth
plan: 04
wave: 3
status: complete
completed: 2026-06-18
tasks_completed: 3
---

# 03-04 SUMMARY — direct-answer blocks (CONTENT-01)

## Objective met
Home, services index, every services/[slug], and locations index now open with a
self-contained ≥2-sentence factual paragraph BEFORE marketing copy, each page
carrying exactly one h1 (the AnswerBlock).

## What changed
- **6 tenant `seo.{locale}.json`** — filled the stub `answerHeading`/`answerBlock`
  fields with real, DISTINCT copy (D-08, not reused from meta.*) for home,
  services-index, the 4 service slugs, and locations; per-tenant facts, qualitative
  pricing (D-29), FR + idiomatic EN. Headings are descriptive page-h1 strings;
  blocks are ≥2 answer-first sentences.
- **4 page types** — `<AnswerBlock>` rendered first in main:
  - Home + service detail: existing inline h1 demoted to h2.
  - Services index + locations: `PageHeader` replaced by `AnswerBlock`
    (`getSeo` added to the locations component).
  Hero/service images keep `priority` (D-20).

## Verification
- `D-11` presence/length → GREEN (42); seo-parity → 26 GREEN.
- **Full suite 276 pass / 0 fail** (all RED foundation tests now green).
- h1 gate: each page file has 0 literal `<h1>` (the single h1 comes from
  AnswerBlock) + AnswerBlock present.
- `bun run build` green. `src/lib/seo.ts` (D-28) + `content.{locale}.json` (D-26) untouched.

## Deviations
- **Descriptive headings rather than literal-question headings.** D-14's canonical
  questions shaped the BLOCK content (answer-first); the `answerHeading` is a strong
  descriptive page h1 (brand/service + city), which is better SEO and still distinct
  from meta titles (D-08).
- **No inline links in answer blocks** — consistent with the 03-03 FAQ choice; keeps
  fr/en parity trivial.

## Commits
- `43933d8` author answerBlock/answerHeading copy
- `d22da2c` wire AnswerBlock + demote h1 on 4 page types
