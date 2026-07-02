# ADR 0008 — no settings form-contract module; the round-trip owner already exists

- **Status:** Accepted
- **Date:** 2026-07-02
- **Context module:** Presentation / admin settings form; Store settings (see `CONTEXT.md`)

## Context

An architecture review (`/improve-codebase-architecture`, 2026-07-02, Candidate 4,
"Speculative") proposed a `form-contract.ts` module to "concentrate the settings
round-trip," on the premise that the draft ⇄ sparse-doc ⇄ schema contract is
spread across three modules (`SettingsForm.tsx`, `settings-draft.ts`,
`store-settings-schema.ts`) with a fourth re-validation on the wire, so "no
single interface says: this is the settings round-trip."

Surveying the code showed the premise is false.

## Decision

**Do not build a `form-contract.ts` (or equivalent) round-trip wrapper.** The
round-trip already has a single deep owner, and the schema's separation is a
requirement, not scatter.

## Rationale

- **`settings-draft.ts` is already the round-trip owner.** It colocates *both*
  directions — `buildSparseDoc` (draft → sparse doc) and `stateFromSettings`
  (sparse doc → draft, the inverse) — and the invariant
  `buildSparseDoc(stateFromSettings(doc)) === doc` is explicitly pinned by
  `settings-draft.test.ts` (~30 cases). That *is* the module the candidate
  proposed to create.
- **A wrapper fails the deletion test.** Delete a `form-contract.ts` and the two
  already-colocated functions reappear unchanged — complexity does not
  concentrate, so the wrapper would be shallow (interface ≈ implementation), the
  exact anti-pattern of ADR 0004 / ADR 0007.
- **The schema is correctly separate because it is genuinely shared.**
  `StoreSettings = z.infer<typeof StoreSettingsSchema>` is one type used at four
  sites across both tiers: it types `buildSparseDoc`'s output (client build
  target), validates the route input (`adminWrite(StoreSettingsSchema, …)`, the
  write path), and validates the persisted doc on **read** twice
  (`parseWithSchema(StoreSettingsSchema, …)` for the public and admin store
  reads). Folding the schema into a form-marshaling module would couple the
  persisted-shape validator to the form and break the store-read reuse.
- **The "double validation" is deliberate defense-in-depth, not redundancy.** The
  schema is the boundary validator for untrusted write input *and* for corrupt
  stored docs (the loud/degrade contract in CONTEXT.md "Store read resolution").
- **"Add a field touches schema + marshal + form" is inherent.** Those are three
  distinct concerns — validation shape, persistence rule, UI. No abstraction
  removes all three without coupling unrelated things.

## Consequences

- No new module. `SettingsForm` owns React state + fetch/save orchestration;
  `settings-draft.ts` owns the draft↔doc marshal (both directions, tested);
  `store-settings-schema.ts` owns the shared persisted-shape schema.
- Future architecture reviews should **not** re-suggest a settings
  `form-contract` / round-trip wrapper. Reopen only if a second form grows the
  identical marshal+schema+state shape (a real second adapter), or if the schema
  stops being shared across the read and write paths.
