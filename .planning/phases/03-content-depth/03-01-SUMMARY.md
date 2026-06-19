---
phase: 03-content-depth
plan: 01
wave: 1
status: complete
completed: 2026-06-18
tasks_completed: 3
---

# 03-01 SUMMARY — RED foundation (D-13 / D-05 / D-11 / F-02)

## Objective met
Test-first foundation for Phase 3: offline sentence splitter + word counter, two
unwired build-guard functions (FAQ floor, answer-block presence), extended FR/EN
parity assertions, and all stub JSON scaffolds so new import chains resolve and
the build stays green.

## What changed
- **`schema-invariants.ts`** — added `splitSentences`, `countWords`,
  `FAQ_FLOOR=20`, `ANSWER_BLOCK_MIN_SENTENCES=2`, and the UNWIRED guards
  `checkFaqFloor()` (D-05) + `checkAnswerBlockPresence()` (D-11). All per-tenant
  JSON imported via **relative, alias-free** paths (`./tenants/...`) for the
  next.config.ts SWC require-hook.
- **8 faq stubs** — `{ "items": [] }` for ongles-maily / ongles-charlesbourg /
  ongles-rivieres / template × fr/en.
- **10 seo files** — base + 4 tenants × fr/en gained the answer-block key
  skeleton: `meta.{home,services}AnswerBlock/AnswerHeading`, per-service
  `answerBlock/answerHeading`, and a new top-level `locations.{answerBlock,answerHeading}`.
- **Tests** — D-13 splitter (GREEN), D-05 floor + D-11 presence (RED by design,
  flip GREEN in 03-03/03-04), F-02 parity extensions (GREEN).

## Verification
- `bun test -t "D-13"` → 9/9 GREEN.
- `bun test src/config/seo/seo-parity.test.ts` → 26/26 GREEN.
- Full suite → 223 pass, 48 fail = exactly D-05 (6) + D-11 (42), the intended RED.
- `bun run build` → green (guards not yet wired into `assertSchemaInvariants`).
- `grep '@/'` in guard regions → none (header comments only).

## Deviations
- **D-13 abbreviation set excludes `etc`.** Tracing test case
  `"…, etc. Réservez …" → 2` proved blanket-protecting `etc` (as the plan's
  abbreviation list implied) would wrongly merge it into one sentence. The
  uppercase-lookahead already handles real boundaries; only title/unit
  abbreviations (Mme./Dr./av.…) are protected. Behaviour matches all 9 D-13 cases.

## Commits
- `bce3d8b` feat(03-01): splitter/counter + constants (D-13)
- `4913dc7` test(03-01): stubs + RED D-05/D-11 guards (unwired)
- `73538d6` test(03-01): FR/EN parity extension (answerBlock + per-tenant faq)
