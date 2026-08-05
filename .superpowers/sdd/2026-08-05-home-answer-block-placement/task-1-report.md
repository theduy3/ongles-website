# Task 1 Report — Homepage hierarchy regression test

## Status

DONE

## What was implemented

Added the bilingual homepage regression test in e2e/homepage.spec.ts. The test
checks /fr and /en for exactly one H1, an Ongles Maily H2 answer heading, the
localized answer paragraph, and the document order hero H1 → answer section →
#services.

## TDD evidence

### RED

Command:

    bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"

Relevant result:

    1) homepage enhancements (/fr) › keeps the hero first and places the direct answer before services
    Error: expect(locator).toHaveCount(expected) failed
    Locator: locator('main').getByRole('heading', { name: /Ongles Maily/i, level: 2 })
    Expected: 1
    Received: 0
    at e2e/homepage.spec.ts:60:35
    1 failed

This is the intended failure before the production change: the current
homepage renders the answer heading as H1 before the hero, so the new H2
contract is not yet satisfied.

The first browser attempt exposed a missing local Playwright Chromium binary;
Chromium was installed in the workspace environment before the focused command
was rerun. The browser setup issue is resolved and is not a product failure.

GREEN is intentionally deferred to the later AnswerBlock and homepage wiring
tasks.

## Files changed

- e2e/homepage.spec.ts

## Commit

- f10c962 test: lock homepage answer placement

## Self-review

- The test exercises real rendered DOM rather than mocks.
- The test covers both live locales and verifies the actual localized answer
  copy.
- The test does not change production code or duplicate tenant content.

## Concerns

- The production build-backed Playwright setup requires the local Chromium
  binary; the binary is now available in the environment.

## Fix round 1 — tighten the localized hero assertion

### Reviewer finding addressed

The original regression used `main.locator("h1")`, so it counted any H1 in
`main` rather than proving that the locale-specific hero title was the H1. The
ordering probe also started from a generic `querySelector("h1")`. The test now
locates the hero by its exact localized accessible heading name and uses that
located hero element for the ordering check.

### Changed file

- `e2e/homepage.spec.ts`

The test still covers both `/fr` and `/en`, the localized answer copy, the
level-2 answer heading, and the hero → answer → services ordering contract. No
production files were changed.

### Checks

- `bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"` — RED as
  expected against the current unimplemented production code (exit 1). On
  `/fr`, the localized hero H1 locator
  `/Des soins d'ongles professionnels, faits pour Vous/i` resolved to 0
  elements (expected 1), because the current page still renders the answer as
  H1 and the hero title as H2. The loop therefore stops at `/fr`; `/en`
  coverage remains in the test source for the production fix.
- `bun test src/` — PASS, 676 tests passed and 0 failed (1,330 expectations).
- `bun run lint` — BLOCKED by the existing baseline lint errors (exit 1):
  `src/components/ConsentBanner.tsx:97` (`react-hooks/immutability`) and
  `src/components/ConsentBanner.tsx:100` (`react-hooks/set-state-in-effect`),
  plus four warnings. This fix has no `ConsentBanner.tsx` diff from the branch
  baseline (`git diff 05a0123..HEAD -- src/components/ConsentBanner.tsx` is
  empty).
- `bun run build` — PASS; Next.js 16.2.6 compiled successfully, TypeScript
  completed, and all 15 static pages generated.
- `git diff --check` — PASS.

### Commit

- Fix-round implementation commit: `f9c1578` (`test: tighten homepage hero assertion`).
- The report is included in the final amended commit with the same message.

## Fix round 2 — align homepage locale describe

Updated the describe label to identify both covered locales.

### Changed file

- `e2e/homepage.spec.ts`

### Commit

- Parent commit hash: `454e4a89a15596d5abd77254d12da1dfc6729ff4`

## Fix round 2 — assert singleton homepage H1

Added an assertion that the homepage `main` contains exactly one H1 while
retaining the localized hero H1 locator and its count and visibility checks.
This keeps the sole H1 bound to the expected localized hero text and detects
any extra H1 in `main`.

### Changed file

- `e2e/homepage.spec.ts`

### Checks

- `bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"` — RED
  as expected against the current pre-implementation production code at
  `http://localhost:3100` (exit 1). The `/fr` localized hero H1 locator
  expected 1 element but received 0 because the current page still renders the
  answer as H1 and the hero title as H2; the test stops before `/en`.
- `git diff --check` — PASS (exit 0).

### Commit

- Fix-round implementation commit: `f57a61b` (`test: assert singleton homepage h1`).
