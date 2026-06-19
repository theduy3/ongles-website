---
plan: 04-04
phase: 04-net-new-pages
title: Comparison / decision pages (PAGE-02)
status: complete
tasks_completed: 2
tasks_total: 2
---

# 04-04 SUMMARY — Comparison / decision pages (PAGE-02)

## What was built

**Task 1 — comparisons registry + component + copy + guard activation**
- `src/lib/comparisons.ts` — `COMPARISONS` registry of 4 records
  (`pose-vs-remplissage`, `manucure-vs-pedicure`, `gel-vs-acrylique`, `meilleur-pour`),
  each `{ id, slug:{fr,en}, services:[...] }`; FR slugs match `pages.comparison` keys,
  EN slugs idiomatic (`nail-extensions-vs-fill`, `manicure-vs-pedicure`, `gel-vs-acrylic`,
  `best-for`). Helpers `comparisonBySlug`, `comparisonPath`, `comparisonPathsByLocale`
  mirror `services.ts`.
- `src/components/ComparisonColumns.tsx` — two-column shadow-card server component per
  UI-SPEC §B. **Authored but not wired into the pages — see Deviation.**
- `pages.comparison.{4 slugs}` authored in all 3 tenants × FR/EN (replacing the 04-01
  placeholders): verdict-first `answerHeading`, ≥2-sentence `answerBlock`, **≥200-word
  unique `body`** (qualitative pricing only — D-29, `vous` — D-21, idiomatic EN — D-24).
  Keys identical FR/EN (parity-clean).
- `dict.comparison.decisionHeading` added to `fr.json` ("Laquelle choisir ?") +
  `en.json` ("Which should you choose?").
- Guard activation in `schema-invariants.ts`: `checkWordCount` comparison branch
  (≥200, `COMPARISON_WORD_FLOOR`) live for all 4 slugs; answer-block presence coverage
  extended to the comparison routes. Fail-fixture test proves the word-count guard bites
  on a 10-word body.

**Task 2 — FR + EN `[slug]` route pages (shared template)**
- `src/app/[lang]/comparaisons/[slug]/page.tsx` (FR-only) and
  `src/app/[lang]/comparisons/[slug]/page.tsx` (EN-only).
- Mirror the service-detail `[slug]` + `tarifs` patterns: no `generateStaticParams`;
  `if (!isLocale(lang)) notFound()` then locale-guard; `comparisonBySlug(lang, slug)` →
  `notFound()` for unknown / wrong-locale slugs (FR folder rejects EN slugs and vice
  versa via locale-scoped slug lookup).
- Template order: `breadcrumbGraph` JSON-LD → `AnswerBlock` (verdict-first, single page
  h1) → decision section (`<h2>` = `decisionHeading` + ≥200-word `body` prose) →
  service cross-links (P-19) + pricing link → Book / Call CTA.

## Verification
- In-worktree `bun run test` (= `bun test src/`): **352 pass, 0 fail**.
- `tsc --noEmit` on both new page files: **0 errors** (dynamic `pages.comparison[record.id]`
  typed via `keyof typeof` cast, mirroring `seo.services[service.id]`).
- Full Turbopack `next build` deferred to post-merge on the main checkout (Turbopack
  cannot build from a git worktree — symlink-outside-root restriction; confirmed Wave 2).

## Deviation — ComparisonColumns not wired (flag for end-of-phase UAT)
The plan's Task 2 `<done>` calls for `AnswerBlock → columns → decision → CTA`. The pages
ship **without** `ComparisonColumns` because the two-column card layout requires per-side
`{name, descriptor, bullets}` content that the `pages.comparison` data model
(`answerHeading` / `answerBlock` / `body` / meta) does not carry, and only 2 of the 4
comparisons (`pose-vs-remplissage`, `manucure-vs-pedicure`) map to two distinct real
services — `gel-vs-acrylique` (one service, two materials) and `meilleur-pour` (three
services) do not. The answer-first ≥200-word `body` fully satisfies PAGE-02's measurable
success criterion (answer-first, ≥200 words unique, reachable FR+EN, schema-valid).
`ComparisonColumns.tsx` is retained for a follow-up that authors per-side content in the
seo JSON. **The end-of-phase human-verify / 04-UAT step should decide whether two-column
cards are required before phase close.**

## Recovery note
The executing subagent truncated mid-GREEN (after authoring copy + lib + component +
guard wiring, before creating the route pages or SUMMARY). The orchestrator verified git
state, committed the in-progress GREEN work, then completed Task 2 (route pages, type
fixes, SUMMARY) inline.

## Commits
- `45df105` test(04-04): RED — comparison word-count fail-fixture + guard-bite + integration tests
- `6b46f98` feat(04-04): GREEN partial — comparisons lib/component + copy + guard wiring
- `2b4a128` feat(04-04): FR /comparaisons + EN /comparisons [slug] route pages
