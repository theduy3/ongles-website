# Deepen the tenant-store seam — pure response→envelope core

> From `/improve-codebase-architecture` (2026-07-01), Candidate 1, grilled.
> Deepening: turn the untestable parse-and-degrade behaviour into a pure,
> exported core, tested through plain data. Additive only.

## Decision (grilled)

- **Shape (Q1):** (C) extract the pure parse/degrade core; DON'T fake the Supabase
  client and DON'T stand up a gateway pair. Prefer a pure testable core over mocking IO.
- **Boundary (Q2):** (b) extract the full **response→envelope decision**, not just the
  parse — the untested contract is the silent-vs-loud asymmetry + error mapping, not
  `parseWithSchema` (already tested).
- **Scope (Q3):** additive. Public fn signatures unchanged. IO shell keeps calling
  `getSupabasePublic()/getSupabaseAdmin()` and reading `tenant.id`. **Zero caller churn**
  (8 API routes, store-config.ts, layeredLocaleContent `readSettings:` all untouched).
  The "inject the client + tenant id" goal from the report **dissolves** — the pure core
  never touches them.
- **Placement (Q4):** co-locate `resolve*` fns in each store file. `tenant-store.ts` stays
  as-is (`StoreResult`, `parseWithSchema`).
- **Tests (Q5):** new pure tests below. Existing tests survive. One accepted gap.

## The pure core (co-located, exported)

**popups-store.ts** — already has private `parseRows`; export it.
```
parseRows(rows: { id: string; doc: unknown }[]): Popup[]
```

**store-settings-store.ts** — extract the two decisions the IO shell delegates to.
Both take the ALREADY-FETCHED Supabase response as plain data:
```
type SbRead<T> = { data: T | null; error: { message: string } | null };

// public: degrade to null on error / no row / corrupt (silent — caller falls to static)
resolvePublicRead(res: SbRead<{ doc: unknown }>, label: string): StoreSettings | null

// admin: loud on corruption so the operator sees it
resolveAdminRead(res: SbRead<{ doc: unknown }>, label: string): StoreResult<StoreSettings | null>
//   error        -> { ok:false, reason:"failed", detail: error.message }
//   no row       -> { ok:true,  data: null }
//   corrupt doc  -> { ok:false, reason:"failed", detail:"stored doc failed schema validation" }
//   valid doc    -> { ok:true,  data: settings }
```
IO shell shrinks to: `const res = await client…; return resolveAdminRead(res, tenant.id)`.

## TDD order

1. **RED** `popups-store.test.ts`: `parseRows` — valid kept · invalid dropped · order
   preserved · `[]` on empty · never throws on garbage · logs once/bad-row (label=id).
2. **GREEN** export `parseRows` (already implemented; just export + no behaviour change).
3. **RED** `store-settings-store.test.ts`: add `resolvePublicRead` cases (error→null,
   no-row→null, corrupt→null, valid→settings).
4. **GREEN** extract `resolvePublicRead`; shell delegates.
5. **RED** `resolveAdminRead` cases — the integrity asymmetry (corrupt→failed(detail),
   error→failed(msg), no-row→ok(null), valid→ok).  ← highest-value test
6. **GREEN** extract `resolveAdminRead`; shell delegates.
7. Mark the IO-wiring gap with a comment at each shell (table + `.eq("tenant_id")` +
   `.maybeSingle`/`.order` not unit-covered; e2e/prod only).
8. Run full `bun test`; confirm survivors green (`tenant-store`, `store-settings-store`
   absent-path, `popup`).

## Accepted gap

IO shell wiring is not unit-tested (no fake client — the (C) bargain). Commented at each
shell so it is never *assumed* covered.

## Not extracted (deliberate)

`upsertPopup` / `deletePopup` / `uploadPopupImage` / `upsertStoreSettings` — only logic is
`error → failed`; extracting buys machinery, not coverage.

## CONTEXT.md side effect (propose)

New seam concept: **Store read resolution** — the pure decision turning a Supabase read
response into either a degraded value (public, null-on-corrupt, silent) or a StoreResult
envelope (admin, loud-on-corrupt). Add under "Layered resolution" if accepted.
