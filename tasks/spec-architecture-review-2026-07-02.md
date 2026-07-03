# Spec — architecture review follow-ups (2026-07-02, third pass)

Source: `/improve-codebase-architecture` run 2026-07-02. Full HTML report was
session-temp; this file is the durable record. Vocabulary per `/codebase-design`
(module / interface / seam / adapter / depth / leverage / locality).

Status: **Candidates 1, 2 & 3 done** (2026-07-02). Follow-up opened: retarget the
inherited SS-clone e2e suite (see "Discovered" section at end).

## Context

Third architecture pass. Codebase healthy: both leads from the 2026-07-01 pass
are fixed on main (`/reviews` routes rating through `trustSignals()`; `llms.txt`
derives from the `COMPARISONS` registry). All eight ADR premises re-verified and
hold. `schema-invariants.ts` confirmed deep, not wide — sole production caller is
`next.config.ts → assertSchemaInvariants()`; the 13 per-check exports are
internal seams for its own test file.

Three candidates remain, ranked.

---

## Candidate 1 — Derive the trust-signal tripwire (Strong; top recommendation) — ✅ DONE 2026-07-02

**Implemented:** `src/app/[lang]/presenter-source.tripwire.test.ts` — walks every
`page.tsx` under `[lang]/` (recursive `node:fs` readdir, anchored via
`import.meta.url`; no Bun-specific APIs, to match sibling tripwire convention)
and asserts none matches `/toLocaleString\(\s*["'][a-z]{2}-[A-Z]{2}["']/`. Includes
a non-vacuity guard (>=15 pages found) and emits file+line on failure. Removed the
now-redundant negative assertion from `reviews/page.trust-signals.test.ts` (kept its
two positive checks; updated header to point at the new repo-wide owner). Bite proven
by temporarily injecting `en-CA`/`fr-CA` into two pages → RED, revert → GREEN. Full
suite 668 pass / 0 fail; only tsc error is the project-wide `bun:test` one.

Discovery during impl: the negative invariant had lived on exactly ONE of 20 pages
(reviews) — home/service tripwires were positive-only — so the derived guard closed
a 19-page gap, not the 16 the report estimated.

--- original spec below ---

## Candidate 1 — Derive the trust-signal tripwire (Strong; top recommendation)

**Problem.** The presenter-bypass regression (a page inlines
`toLocaleString("en-CA")`, so FR renders "4.9" instead of "4,9") has recurred.
The guard is three hand-copied per-page source tripwires:

- `src/app/[lang]/page.trust-signals.test.ts`
- `src/app/[lang]/services/[slug]/page.trust-signals.test.ts`
- `src/app/[lang]/reviews/page.trust-signals.test.ts`

Coverage is re-listed per page; ~16 other `page.tsx` files (and every future
page) ship unguarded until someone hand-writes tripwire #4. The guard against
divergence is itself divergent — no locality.

**Solution.** One tripwire module that DERIVES its coverage from the
filesystem — the codebase's own "derive, don't re-list" pattern applied to its
tests:

- New test (suggested: `src/app/[lang]/presenter-source.tripwire.test.ts`)
  that globs `src/app/[lang]/**/page.tsx` and asserts the negative invariant
  on every file: no hardcoded-locale formatting, i.e. source must not match
  `/toLocaleString\(\s*["'][a-z]{2}-[A-Z]{2}["']/` (and consider `toFixed(` on
  rating-adjacent lines — check existing tripwires for the exact patterns they
  pin).
- Keep the per-page POSITIVE assertions (`trustSignals` present, `trust.show`
  gate flows) in the pages that render a trust signal — those are per-page
  facts, correctly local. Only the negative "no inline locale" guard
  generalizes.
- Delete the now-redundant negative assertions from the three existing
  tripwire files (keep their positive checks).

**Wins:** locality (guard lives once) · leverage (new pages covered free) ·
closes the regression class, not one instance.

**Implementation notes:**
- bun:test; use `node:fs` glob or `readdirSync` recursion (existing tripwires
  use `readFileSync(new URL(...))` — a repo-root-relative glob needs
  `import.meta.url` anchoring or `process.cwd()`).
- Pure source-reading test — no next/navigation imports, so no createContext
  crash risk (see lesson: bun:test + next/navigation).
- Small task; single-context TDD fits.

---

## Candidate 2 — Store IO shell client seam — ✅ DONE 2026-07-02 (as integration test, NOT fake-client)

**Correction:** the "in-memory fake client adapter" framing below was WRONG —
ADR 0003 explicitly forbids it (a fake tests the mock's `.eq` args; `mock.module`
leaks process-globally). Re-reading 0003 showed its reopen trigger had fired (a
second RLS-bypassing write path — popups admin writes, ADR 0007 — plus the
concrete `deletePopup` global-PK cross-tenant risk). So the sanctioned form is a
Supabase INTEGRATION test.

**Implemented:**
- `tests/integration/tenant-scoping.integration.test.ts` — seeds 2 tenants into a
  real local Supabase, asserts admin (RLS-bypassing) paths isolate by tenant:
  deletePopup can't cross-tenant-delete (headline), deletePopup removes own row
  (not a no-op), listPopups/upsertPopup/upsertStoreSettings/getStoreSettings all
  tenant-scoped. Public anon read left to RLS+tenant-JWT (per 0003), not covered.
- `scripts/test-integration.sh` + `bun run test:integration` — boots supabase,
  db reset, injects local keys, TENANT=ongles-maily. Hard-skips unless
  SUPABASE_URL is localhost (never touches prod). Under tests/, so `bun test src/`
  stays hermetic (668 pass, no DB needed).
- ADR 0009 records the reopening (0003's gateway ban still stands).
- Verified: 6 pass / 0 fail vs real Supabase; bite proven by stripping
  `.eq("tenant_id")` from deletePopup → isolation test went RED.

--- original spec below (fake-client framing is superseded) ---

## Candidate 2 — Store IO shell client seam (Worth exploring; CONDITIONAL — do nothing now)

**Problem.** `.eq("tenant_id", …)` scoping — the multi-tenant isolation
invariant — lives in the untested IO shell of `store-settings-store.ts`
(readStoreSettings :51, getStoreSettings :69, upsertStoreSettings :88) and
`popups-store.ts`. Pure store-read-resolution decisions are tested; the wiring
that makes them tenant-safe is not.

**Decision recorded, not work:** ADR 0003 rejected a gateway seam (would
relocate, not shrink, the untested surface). One adapter = hypothetical seam.
**Reopen trigger:** a second adapter (in-memory fake client at the existing
`getSupabasePublic`/`getSupabaseAdmin` seam) becomes justified when ANY of:
- a new store module appears,
- a second admin-write path appears,
- a cross-tenant data incident occurs.

Matches the deferred "store call-site test gap" memory (2026-07-01 — needs a
client-mock strategy first).

---

## Candidate 3 — Page composition band — ✅ DONE 2026-07-02 (scoped to trust-signal render coverage)

**Delivered:** `e2e/trust-signal.spec.ts` — asserts the rating renders in the
locale-correct format ("3,9" FR / "3.9" EN) on all three trust-signal surfaces
(homepage reviews band, /reviews aggregate, service detail), through the real
running page, FR + EN. 6/6 green against the pinned tenant. Includes a divergence
guard (FR must not render "3.9"; EN must not render "3,9") — the render-level
complement to Candidate 1's source tripwire. Also pinned the e2e tenant explicitly
(`playwright.config` webServer `env: { TENANT: … ?? "ongles-maily" }`).

Scoped deliberately: the full "e2e smoke per page per locale" framing below is
NOT built — the inherited e2e suite is orphaned SS-clone cruft (see Discovered),
so a broad page-smoke would mostly re-fail on a non-existent tenant. The
trust-signal risk (the actual bug class) is now covered at BOTH source and render
levels.

--- original spec below ---

## Candidate 3 — Page composition band (Speculative; only if Candidate 1 proves insufficient)

**Problem.** Presenters are tested below; pages' real interface (HTTP) untested
above. The en-CA bug class lives in the untested composition band. bun:test
cannot render async Server Components (next/navigation createContext crash), so
source tripwires are the current mitigation.

**Solution (if ever).** Thin e2e smoke: one GET per page per locale, assert the
locale-formatted trust signal ("4,9" on FR). Tests pages through their real
interface instead of reading source. e2e infra cost is real; CONTEXT.md already
logs page-render coverage as a deferred gap. Do not start before Candidate 1
has shipped and been judged insufficient.

---

## Not to re-suggest (settled by ADR, premises re-verified 2026-07-02)

| ADR | Rejected/accepted deepening |
|-----|------------------------------|
| 0001 | unify store-config merge strategies — rejected |
| 0002 | default readDbLayer — rejected; reopen at a third namespace |
| 0003 | gateway seam over store IO shell — rejected; see Candidate 2 trigger |
| 0004 | getPageContext(lang) factory — rejected; locale guard was the real shape |
| 0005 | split seo.ts — rejected; getPageSeo() facade is the interface |
| 0006 | FR/EN route pairs → per-pair factories — accepted, done |
| 0007 | adminWrite behind pure respondToWrite core — accepted, done |
| 0008 | settings form-contract wrapper — rejected; settings-draft.ts owns round-trip |

---

## Discovered 2026-07-02 — inherited e2e suite is orphaned SS-clone cruft (NEW follow-up)

> Tracked: GitHub issue #44 — https://github.com/theduy3/ongles-website/issues/44


While delivering Candidate 3, a full `bunx playwright test` run showed **37 of 62
e2e tests failing**, all from one root cause: this repo is a clone of the
"SS-website stack" (git: `5a50e39 Initial Pure Nail Bar clone on SS-website
stack`), and the inherited e2e specs assert the **"Ongles Sans Souci"** tenant —
title, "Pourquoi nous" nav, 10 testimonials, 4.9 rating, lash slugs
(`extension-de-cils`), `onglessanssouci.com` canonical. That tenant's config was
never brought into this repo (registry = ongles-maily / -charlesbourg / -rivieres
/ template; grep for "Sans Souci" in `src/config` = nothing). So the specs target
a tenant that does not exist here.

**Investigated the "pin a fixture tenant" fix:** it cannot shrink the drift — no
existing tenant matches the SS assertions, and e2e already ran the real default
(ongles-maily). Pinning `TENANT=ongles-maily` (now done) documents intent but the
SS-baselined assertions still fail against maily.

**The real options for a future session (not done here):**
1. **Retarget** the 6 inherited spec files (content-render, navigation, homepage,
   seo, contact-form, popup-api) to ongles-maily's current content — ~37
   assertions. Largest, but makes e2e real for this site.
2. **Build a frozen e2e fixture tenant** matching the inherited assertions and pin
   it — robust against real-tenant content edits, but adds a synthetic tenant and
   is comparable work.
3. **Delete** the inherited specs and keep only repo-authored ones
   (`trust-signal.spec.ts` + whichever already pass) — smallest, loses coverage.

**Also triage (cruft vs real bug):** `contact-form` (fill timeout — selector
drift?) and `popup-api` (/api/popups returns null — fixture/popups.json?). Do NOT
paper these over; confirm they are inherited-fixture mismatches, not regressions.

**Root fix regardless:** wire e2e into CI (currently Dokploy webhook only, no GH
Actions — that is WHY this rotted uncaught). Even a manual `bun run test:e2e`
gate before ship would have surfaced it.
