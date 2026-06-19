---
phase: 03-content-depth
plan: 05
wave: 4
status: complete
completed: 2026-06-18
tasks_completed: 3
checkpoint: pending-human
---

# 03-05 SUMMARY — activate gate + verify + UAT

## Objective met
The D-05 FAQ-floor and D-11 answer-block-presence guards (written unwired in 03-01)
are now CALLED from `validateSchemaInvariants()` → `assertSchemaInvariants()`, which
`next.config.ts` runs under `PHASE_PRODUCTION_BUILD`. A content shortfall now aborts
`next build` and the Dokploy deploy. Build green with guards live.

## What changed
- **`schema-invariants.ts`** — `checkFaqFloor()` + `checkAnswerBlockPresence()`
  pushed into the `validateSchemaInvariants()` error aggregator. Extracted pure
  predicates `isFaqBelowFloor` / `isAnswerBlockInsufficient` (the gate now uses them).
  Stays alias-free; does not import `getTenantFaq`.
- **`schema-invariants.test.ts`** — tests that `validateSchemaInvariants()` returns
  zero D-05/D-11 errors (and zero overall) on real content, plus gate-bites tests
  proving the predicates flag sub-floor counts (`11 → true`) and empty/1-sentence
  blocks (no JSON mutation).
- **`03-UAT.md`** — SC1-3 automated coverage map + SC4 manual ChatGPT/Perplexity
  spot-check script (per-tenant name+city queries, live hosts, pass/fail capture).

## Verification
- `schema-invariants.test.ts` → 103 pass / 0 fail.
- Full suite → **282 pass / 0 fail**.
- `bun run build` → green with guards WIRED + live.
- Alias-free confirmed (`grep 'from "@/"' / getTenantFaq` → none).
- Gate proven non-no-op: `isFaqBelowFloor(11)===true`, `isAnswerBlockInsufficient("")===true`.

## Open (human checkpoint — Task 4, blocking)
- Local visual verification across tenants (answer block leads, single h1, FAQ ≥20 tenant-correct).
- SC-4 AI-citation spot-check — runs post-deploy (retrieval-dependent).
- Awaiting "approved" to push to main (triggers Dokploy production deploy).

## Commits
- `b3a24cb` wire guards + gate-bites tests + 03-UAT.md
