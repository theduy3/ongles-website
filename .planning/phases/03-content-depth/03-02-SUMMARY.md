---
phase: 03-content-depth
plan: 02
wave: 2
status: complete
completed: 2026-06-18
tasks_completed: 3
---

# 03-02 SUMMARY — shared runtime foundation

## Objective met
The wiring/transform layer both Wave-3 content slices plug into: `FaqItem` type,
the server-only `getTenantFaq()` loader (tenant-first immutable merge, D-06), the
`<AnswerBlock>` server component (carries the page h1), and the `<Accordion>`
link extension (D-30). No content authored; build stays green.

## What changed
- **`config/types.ts`** — `FaqItem = { q; a; link? }` (optional link; base `{q,a}` compatible).
- **`app/[lang]/get-tenant-faq.ts`** — `import "server-only"`, react-cached
  `getTenantFaq(locale)`; pure `mergeFaqItems(base, tenantItems) → [...tenant, ...base]`
  (new array, never mutates). Static `@/` imports of base dict + 4 tenant faq.
- **`components/AnswerBlock.tsx`** — server component: one `<h1>` + one visible
  `<p>` + at most one inline `<a>`, no client directive, no CTA chrome.
- **`components/Accordion.tsx`** — typed `readonly FaqItem[]`; optional inline
  link rendered as separate JSX after the `<p>`; `a` string left untouched (D-30).

## Verification
- `bun test get-tenant-faq.test.ts` → 5/5 GREEN (tenant-first, immutable, plain `a`).
- Full suite → 228 pass, 48 fail = D-05 (6) + D-11 (42) still RED by design.
- `grep "use client" AnswerBlock.tsx` → none; one `<h1>`.
- `bun run build` → green.
- `getTenantFaq` NOT referenced by schema-invariants.ts / next.config.ts (isolated).

## Deviations
- **Test loads the loader via `mock.module("server-only") + dynamic import`** (not a
  static import as the plan wording implied). `server-only` is unresolvable in
  bun:test; this mirrors the established `seo-content.test.ts` / `dictionaries.test.ts`
  convention and keeps `mergeFaqItems` in `get-tenant-faq.ts` per the plan.

## Commits
- `2fc8f6a` feat(03-02): FaqItem + getTenantFaq + AnswerBlock + Accordion link
