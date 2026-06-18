# Phase 2: Schema Completeness + Correctness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 2-Schema Completeness + Correctness
**Areas discussed:** Review/rating rules, Schema validity CI gate, Per-tenant @id identity, FAQ completeness guard, Breadcrumb + Organization

---

## Review / rating rules (SCHEMA-04)

### Q1 — AggregateRating placement
| Option | Description | Selected |
|--------|-------------|----------|
| Business node only | Keep rating on NailSalon LocalBusiness node; safest vs review-spam | |
| Service nodes only | Move onto each Service per literal wording; risk of asserting per-service ratings | |
| Both | Rating on business node + Service references | ✓ |

### Q2 — How Service nodes carry the rating ("Both")
| Option | Description | Selected |
|--------|-------------|----------|
| Link only (recommended) | Business holds rating; Service keeps `provider:{@id}`, no copied value | ✓ |
| Copy rating onto each Service | Emit same rating value on every Service; spam exposure | |

### Q3 — Suppression rule + global-vs-per-tenant data
| Option | Description | Selected |
|--------|-------------|----------|
| Per-tenant source + <5 gate | Suppress when no fresh fetch OR reviewCount<5; review data becomes per-tenant | ✓ |
| Global file + <5 gate only | Add <5 gate, keep single global file; defer per-tenant data | |
| You decide | Apply rule, let research pick source | |

**User's choice:** Both (link only) + per-tenant source + reviewCount<5 gate
**Notes:** Surfaced that AggregateRating on the business node, gated only on `fetchedAt`, conflicts with SCHEMA-04's "nested under Service" wording; resolved by-equivalent (link via `provider`, no value copy) to avoid review-spam risk. Also surfaced the split-brain bug (global `google-reviews.json` gate + per-tenant `site.reviews` values) → review data must be per-tenant.

---

## Schema validity CI gate (SCHEMA-06)

### Q1 — Offline validity check shape
| Option | Description | Selected |
|--------|-------------|----------|
| Types + shape test | schema-dts typing + bun:test asserting required props per type | |
| Types only | schema-dts typing only; rely on manual Rich Results Test | |
| Types + validator lib | schema-dts typing + a JSON-LD/schema.org validator library in tests | ✓ |

### Q2 — Build-blocking vs test-only
| Option | Description | Selected |
|--------|-------------|----------|
| Block the build | Wire validity + parity into next.config.ts guard; abort Dokploy deploy | ✓ |
| Test-only (bun:test) | Local/PR feedback only; no gate before deploy | |
| You decide | Pick based on Phase-1 guard structure | |

**User's choice:** Types + validator lib, blocking the build
**Notes:** Established that Rich Results Test is network/manual and cannot run in bun:test → offline gate is the structural/typing proxy (C-03). No GitHub Actions, so build-blocking (extending Phase 1's next.config.ts guard) is the only automatic gate before Dokploy.

---

## Per-tenant @id identity (SCHEMA-01)

### Q1 — @id convention
| Option | Description | Selected |
|--------|-------------|----------|
| Keep url-based + uniqueness test | Keep `${site.url}/#business`, add uniqueness assertion + clean no-GBP omit | |
| Explicit per-tenant URN | Decouple @id from url via tenant-slug scheme | ✓ |
| You decide | Let research pick | |

### Q2 — URN form
| Option | Description | Selected |
|--------|-------------|----------|
| Stable canonical-URL id | Fixed per-tenant canonical host → `https://{host}/#business`; resolvable, decoupled | ✓ |
| Opaque urn: scheme | `urn:ongles:{tenant}:business`; non-resolvable, slight RRT risk | |
| You decide | Let research pick form | |

**User's choice:** Explicit per-tenant identity, in stable canonical-URL form
**Notes:** Chose to decouple `@id` from the mutable runtime `url`; refined to a resolvable canonical-URL form (Google-preferred over opaque `urn:`) to protect the "Rich Results passes with stable @id" criterion. Uniqueness across TENANT_REGISTRY + clean `sameAs`/GBP omission (D-07 carry-forward) locked.

---

## FAQ completeness guard (SCHEMA-03)

### Q1 — Completeness mechanism + parity scope
| Option | Description | Selected |
|--------|-------------|----------|
| Count-match + parity now | Assert schema items === dict FAQ count per tenant/locale; extend parity guard to FAQ dictionaries now | ✓ |
| Count-match only, defer parity | Add count-match now; leave FAQ parity to Phase 3 | |
| You decide | Lock count-match; let planning decide parity timing | |

**User's choice:** Count-match test + add FAQ dictionaries to parity guard now
**Notes:** FAQ content lives in `dictionaries/{en,fr}.json` (separate from the `seo.{locale}.json` already parity-checked). Pulled FAQ-dictionary parity forward from Phase 3 so CONTENT-02's deepening is drift-protected from day one.

---

## Breadcrumb + Organization (SCHEMA-05)

### Q1 — Organization modeling
| Option | Description | Selected |
|--------|-------------|----------|
| NailSalon-as-Organization | Keep top NailSalon node as org entity (subtype satisfies it); verify breadcrumb coverage | |
| Add distinct brand Organization | Top-level Organization node; NailSalon locations reference via parentOrganization | ✓ |
| You decide | Let research pick by location count | |

**User's choice:** Add a distinct brand Organization node
**Notes:** Confirmed breadcrumb already renders on 10+ sub-pages and `organizationGraph` emits NailSalon + per-location departments + WebSite but no distinct Organization. Chose a distinct brand Organization node (own `#organization` @id, locations reference via `parentOrganization`) for a cleaner brand entity / multi-location signal. Verify breadcrumb on every indexable sub-page (O-02).

---

## Claude's Discretion

- Exact per-tenant review-data location + tenant resolution (R-03)
- Specific offline JSON-LD/schema.org validator library (C-01)
- Canonical-host identity field vs. reused production host for @id base (I-01)
- SCHEMA-02 single-price handling — left as-is (current `offer()` is correct)

## Deferred Ideas

- SCHEMA-02 single-price → AggregateOffer coercion (not changing — current behavior correct)
- FAQ content depth → Phase 3 (CONTENT-02)
- Automated/monitored Google reviews fetch → post-milestone
- Per-location independent ratings → out of scope (one salon-wide rating, linked from services)
