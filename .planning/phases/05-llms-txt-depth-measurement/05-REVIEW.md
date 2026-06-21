---
phase: 05-llms-txt-depth-measurement
review_depth: standard
status: resolved
critical: 0
warning: 1
warning_resolved: 1
info: 3
reviewed_files: 35
base_ref: b395f1b
authored_by: orchestrator (gsd-code-reviewer agent stalled before writing; closed out inline)
date: 2026-06-20
---

# Phase 05 Code Review (advisory)

Scope: `git diff b395f1b..HEAD -- src/ docs/` (35 files). Advisory only — no source modified.
Verification context: full unit suite 511/511, production build exit 0, gate-bites tests pass.

## Critical (0)
None.

## Warning (1)

### W-1 — `checkLlmsLeak` under-protects: matches full landmark string + city only, not bare borough tokens — ✅ RESOLVED (commit 6281f9b)

**Resolution:** `checkLlmsLeak` now derives distinctive landmark tokens (e.g. `beauport`,
`charlesbourg`, `rivières`) in addition to the full landmark string + city, stopword-filters
generic place words (carrefour/centre/boulevard/…), and matches single tokens on word boundaries.
Gate-bites added: a bare borough token in another tenant's prose is caught; `"centre commercial"`
generic prose stays clean. Real prose re-verified leak-free; suite 513/0; build exit 0.

**File:** `src/config/schema-invariants.ts` — `checkLlmsLeak()`

The leak guard derives each tenant's signals from `contact.landmark` (full string, e.g.
`"Carrefour Beauport — Entrées 4 ou 5"`) and `address.city` (`"Québec"` / `"Trois-Rivières"`),
then flags another tenant's `llmsDescription` only if it contains one of those **full** strings.

The distinguishing borough names (**Beauport**, **Charlesbourg**) live *inside* the landmark
string, not in `city` (both Québec-City salons have `city: "Québec"`). So if a tenant's prose
ever said a bare `"Charlesbourg"` or `"Beauport"` belonging to another tenant, the guard would
**not** catch it — the full landmark substring wouldn't be present, and the city is shared.

**Impact:** the gate appears to enforce "no cross-tenant landmark" but only enforces the exact
full landmark string. A partial/borough leak passes the build. (No live leak today — all three
prose values were verified clean — so this is a latent coverage gap, not an active bug.)

**Suggested fix:** derive token-level signals in addition to the full string — e.g. split the
landmark on separators (`—`, `,`, whitespace) and index significant tokens (drop generic words
like "Carrefour"/"Centre"/"Entrées"), or maintain an explicit per-tenant forbidden-token list
(`Beauport`, `Charlesbourg`, `Trois-Rivières`, `Les Rivières`). Keep the existing shared-signal
skip so a tenant's own borough isn't self-flagged. Add a gate-bites fixture proving a bare
borough token in another tenant's prose triggers LLMS-01.

## Info (3)

### I-1 — `Math.min(...services.map(...))` returns `Infinity` on empty services
**File:** `src/app/[lang]/page.tsx`
`const fromPrice = Math.min(...services.map((s) => s.price));` yields `Infinity` if `services`
is ever empty → "à partir de $Infinity" in the hero. Tenant config always populates 4 services,
so latent only. Guard: `services.length ? Math.min(...) : null` and render the price anchor only
when non-null.

### I-2 — pricing-href fallback uses the FR slug for both locales
**Files:** `src/app/[lang]/page.tsx`, `src/app/[lang]/services/[slug]/page.tsx`
`pricingNav?.hrefByLocale?.[lang] ?? pricingNav?.href ?? "/tarifs"` — if `pricingNav` were ever
absent, the EN page would link `/en/tarifs` (should be `/pricing`). `site.nav` always contains the
`pricing` entry, so latent only. If keeping a fallback, make it locale-aware
(`lang === "fr" ? "/tarifs" : "/pricing"`).

### I-3 — `checkLlmsLeak` reports one leak per other-tenant (break-after-first-match)
**File:** `src/config/schema-invariants.ts`
The inner `break` stops at the first matching signal per other-tenant pair, so multiple distinct
leaks against the same other-tenant collapse to one error. Intentional and documented; the gate
still bites (≥1 error aborts the build). Noted for completeness — no change required.

## Verified clean (positive findings)
- **Locale parity:** `content.fr.json`/`content.en.json` and `dictionaries/fr.json`/`dictionaries/en.json`
  are key-identical (no fr-only/en-only keys) — the project's #1 footgun is clear.
- **No cross-tenant leak in live prose:** all three `llmsDescription` values scanned free of any
  other tenant's borough/landmark/city tokens.
- **GA4 warning-only path correct:** `checkGA4IdPresent` emits via `console.warn` from the impure
  `assertSchemaInvariants()`; `validateSchemaInvariants()` stays pure and free of MEAS-01.
- **Build-blocking guards green:** production build passes with `checkLlmsDepth`/`checkLlmsLeak`/
  `checkNapConsistency` live; gate-bites fixtures confirm they are not no-ops.
- **Shared-city fix sound:** same-city salons sharing "Québec" no longer false-positive.

## Recommendation
Ship as-is — no Critical/blocking issues. W-1 is the one worth a follow-up (a small hardening of
the leak guard's token granularity); I-1/I-2 are cheap defensive guards. None block the deploy.
