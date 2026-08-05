# Task 3 Report — Reorder and relabel the homepage only

## Status

DONE

## Changed file

- `src/app/[lang]/page.tsx`

## Implementation summary

Removed the pre-hero homepage `AnswerBlock` and marked the hero as the first
visible section. Promoted only the hero title from `h2` to `h1`, preserving its
text, className, nested emphasis, and layout. Rendered the existing configured
answer immediately after the hero with `compact` styling and
`headingLevel="h2"`; services and all later sections remain unchanged.

## Focused test

Command:

```bash
bun run test:e2e -- e2e/homepage.spec.ts -g "keeps the hero first"
```

Output:

```text
$ playwright test "e2e/homepage.spec.ts" -g "keeps the hero first"
[WebServer] $ next build
Running 1 test using 1 worker
  ✓  1 [chromium] › e2e/homepage.spec.ts:45:7 › homepage enhancements (/fr and /en) › keeps the hero first and places the direct answer before services (1.2s)

  1 passed (45.9s)
```

The Playwright web server built and started a fresh production server. The
passing test covers both `/fr` and `/en`.

## Commit

- Initial implementation commit before report amend: `e8306250793f114ae6308c0e7b25de0aeef53216`
