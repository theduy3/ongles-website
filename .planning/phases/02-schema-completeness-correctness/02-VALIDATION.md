---
phase: 2
slug: schema-completeness-correctness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `02-RESEARCH.md` §Validation Architecture (req→test map verified against live codebase).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — `bun test src/` discovers `*.test.ts` |
| **Quick run command** | `bun test src/config/schema-invariants.test.ts` |
| **Full suite command** | `bun test src/` |
| **Estimated runtime** | ~5 seconds |

**Dual-runtime constraint:** schema invariants must also run inside the Node-20 `next.config.ts` build guard (offline, no network) — not only under Bun. Any validator helper imported by the guard must be plain TS/JS with static imports (Phase 1 `.ts`-transpile lesson). `tsc` typecheck covers the schema-dts (SCHEMA-06) compile assertion.

---

## Sampling Rate

- **After every task commit:** Run `bun test src/config/schema-invariants.test.ts`
- **After every plan wave:** Run `bun test src/`
- **Before `/gsd-verify-work`:** Full suite green + `next build` succeeds (build guard passes) + `tsc --noEmit` clean
- **Max feedback latency:** ~5 seconds (quick) / ~15 seconds (full)

---

## Requirements → Test Map (from RESEARCH)

| Req ID | Behavior | Test Type | File | Command |
|--------|----------|-----------|------|---------|
| SCHEMA-01 | `@id` stable (canonical-host derived), no cross-tenant collision | invariant | `src/config/schema-invariants.test.ts` | quick |
| SCHEMA-02 | Offer/AggregateOffer correct (existing `offer()` verified, not changed) | invariant | `src/config/schema-invariants.test.ts` | quick |
| SCHEMA-03 / F-01 | FAQPage `mainEntity.length === dict.faq.items.length`; no empty q/a | invariant | `src/config/schema-invariants.test.ts` | quick |
| SCHEMA-04 / R-02 | AggregateRating suppressed when `fetchedAt` null OR `reviewCount < 5`; present otherwise | invariant | `src/config/schema-invariants.test.ts` | quick |
| SCHEMA-05 / O-01 | distinct `Organization` node present; locations link via `parentOrganization` | invariant | `src/config/schema-invariants.test.ts` | quick |
| SCHEMA-05 / O-02 | `breadcrumbGraph` on every indexable sub-page (11 confirmed; home needs none) | manual verify (already met) | — | grep / review |
| SCHEMA-06 | schema-dts types compile; FR/EN `seo.json` parity passes | compile (tsc) + parity | `src/config/seo/seo-parity.test.ts` | `tsc --noEmit` + parity |
| F-02 | `dictionaries/{en,fr}.json` `faq.items` key parity | parity | `src/config/seo/seo-parity.test.ts` | full |
| I-02 | no cross-tenant `@id` collision across `TENANT_REGISTRY` | invariant | `src/config/schema-invariants.test.ts` | quick |
| I-03 | `sameAs` absent (not `[]`) when `socialProfiles` empty | invariant | `src/config/schema-invariants.test.ts` | quick |

*Per-task rows (with plan task IDs + threat refs) are filled by the planner / nyquist-auditor once `02-*-PLAN.md` exist.*

---

## Wave 0 / Wave 1 Requirements

TDD order — failing test before implementation (research mandates write-test-first for the invariant module):

- [ ] `src/config/schema-invariants.ts` — invariant assertions module (mirrors Phase 1 `config-completeness.ts`)
- [ ] `src/config/schema-invariants.test.ts` — failing `bun:test` first, then GREEN
- [ ] Per-tenant `src/config/tenants/{id}/google-reviews.json` stubs (charlesbourg, rivieres, maily)
- [ ] Extend `src/config/seo/seo-parity.test.ts` to cover `dictionaries/{en,fr}.json` `faq.items` (F-02)

*bun:test framework already present — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google Rich Results Test pass — NailSalon home | SCHEMA-01 (criteria 1) | Network/Google service; not automatable offline (C-03) | Run RRT on each tenant home URL during UAT; confirm NailSalon + stable `@id` |
| Google Rich Results Test pass — Service page | SCHEMA-02 (criteria 2) | Network/Google service | Run RRT on ≥1 service page per tenant |
| Breadcrumb coverage spot-check | SCHEMA-05 / O-02 | Already met; visual confirm only | Confirm breadcrumb JSON-LD on contact/faq/services/[slug]/about/reviews/etc. |

*Offline invariant + parity tests are the structural proxy; RRT is the human-facing proof.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0/1 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0/1 covers all MISSING references (schema-invariants module + per-tenant review stubs)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
