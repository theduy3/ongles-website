# Phase 1: Per-Tenant Config Completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 1-Per-Tenant Config Completion
**Areas discussed:** Data sourcing, Pricing model, "Complete" definition, Completeness guard

---

## Data Sourcing

### Q1 — Source of truth for unconfirmed real-world facts
| Option | Description | Selected |
|--------|-------------|----------|
| I'll hand you values | User supplies; Claude doesn't guess | ✓ |
| Derive what's safe | Claude geocodes/derives low-risk fields | |
| Mix, field-by-field | Decide per field together | |

**User's choice:** I'll hand you values
**Notes:** Every TODO treated as "awaiting user input"; no derivation even of safe fields.

### Q2 — When/how to supply values
| Option | Description | Selected |
|--------|-------------|----------|
| Checklist first, fill offline | Generate per-tenant data-request checklist | ✓ |
| Some now, rest later | Partial now, rest as blockers | |
| All at execution time | No collection now | |

**User's choice:** Checklist first, fill offline
**Notes:** Produced `01-DATA-CHECKLIST.md`.

### Q3 — ongles-rivieres live or coming-soon
| Option | Description | Selected |
|--------|-------------|----------|
| Live — full data now | Same bar as Charlesbourg | ✓ |
| Coming-soon — defer | Exclude from completeness gate | |
| Live but lower priority | Both in scope, Charlesbourg first | |

**User's choice:** Live — full data now
**Notes:** Both Charlesbourg + Rivières are in full scope this phase.

---

## Pricing Model

### Q1 — Is the mirrored pricing intentional
| Option | Description | Selected |
|--------|-------------|----------|
| Distinct per location | Real per-tenant prices in checklist | ✓ |
| Uniform chain pricing | Drop TODO, shared menu is truth | |
| Uniform now, distinct later | Mirror for launch, refine later | |

**User's choice:** Distinct per location

### Q2 — Is the service menu the same across tenants
| Option | Description | Selected |
|--------|-------------|----------|
| Same catalog, prices differ | Shared 4 services, prices vary | ✓ |
| Per-tenant menus | Different service lists | |
| Same for now | Shared catalog for launch | |

**User's choice:** Same catalog, prices differ

---

## "Complete" Definition

### Q1 — Phase-1 completion bar
| Option | Description | Selected |
|--------|-------------|----------|
| Required-core must be real | Core real; optional defers w/ fallback | ✓ |
| Everything or block | All TODOs confirmed or blocked | |
| Best-effort, document gaps | Fill what exists, ship | |

**User's choice:** Required-core must be real

### Q2 — Which debatable fields belong in required-core (multi-select)
| Option | Description | Selected |
|--------|-------------|----------|
| Geo coords | LocalBusiness geo / near-me accuracy | ✓ |
| SalonX storeId | Booking widget functionality | ✓ |
| Contact email | Contact surfaces | ✓ |
| Google Maps CID | GBP linkage for schema | ✓ |

**User's choice:** All four → required-core is nearly everything (only gift-cert URL left optional).

### Q3 — Maps CID behavior if no GBP exists
| Option | Description | Selected |
|--------|-------------|----------|
| Required-if-exists | Real if GBP exists, else deferred w/ clean omission | ✓ |
| Hard-block until GBP exists | Phase blocked on GBP creation | |
| Always deferred | Never gates Phase 1 | |

**User's choice:** Required-if-exists
**Notes:** Surfaced the tension that requiring Maps CID could block on external GBP creation; resolved to required-if-exists.

---

## Completeness Guard

### Q1 — How to enforce required-core completeness
| Option | Description | Selected |
|--------|-------------|----------|
| Validator + CI test | Pure validator + bun:test over TENANT_REGISTRY | ✓ |
| Runtime warn only | dev console.warn, no test | |
| Manual fill + eyeball | No new code | |

**User's choice:** Validator + CI test

### Q2 — Where the validator runs to be a real guard
| Option | Description | Selected |
|--------|-------------|----------|
| Prebuild hook (blocks deploy) | Fails build → aborts Dokploy deploy + bun:test | ✓ |
| bun:test only | Relies on PR discipline | |
| Both, but test is the gate | Test now, prebuild fast-follow | |

**User's choice:** Prebuild hook (blocks deploy)
**Notes:** Chosen because there is no GitHub-Actions CI gate before the Dokploy webhook deploy — a test alone wouldn't block a bad deploy.

---

## Claude's Discretion

- Validator implementation shape (zod schema over tenant types vs. explicit required-field array), file location, and exact prebuild wiring (`prebuild` npm script vs. `next.config.ts` hook).

## Deferred Ideas

- Per-tenant service menus (rejected for this milestone — same catalog locked).
- SalonCard cross-promo of sibling domains (CONCERNS.md, post-launch).
- Automated/monitored Google reviews fetch (Phase 2 SCHEMA-04 concern).
