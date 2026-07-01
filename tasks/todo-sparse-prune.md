# Generic Sparse-Prune for Store Settings (C04) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace `buildSparseDoc`'s ~25-field hand-walk (and the `buildSeoLocale`/`pruneStrings`/`pruneNested` helpers) with one generic recursive `pruneEmpty`, so adding an admin-editable field needs only a schema + form edit — `buildSparseDoc` stops enumerating fields. Unify the currently-inconsistent prune semantics into one tested rule. Make the `buildSparseDoc↔extractSeo` round-trip testable as a pair.

**Architecture:** A new pure `src/lib/prune-empty.ts` (peer to `deep-merge.ts`) drops empties recursively. `buildSparseDoc` uses it for the generic value fields, keeping three explicit *semantic* filters (`hours` validity, `services` non-id-value, `customCode` non-blank) that generic-empty can't express. Public signatures unchanged → `SettingsForm` + the admin API route are untouched; the server still re-validates via `StoreSettingsSchema`.

**Tech Stack:** TypeScript, Zod, `bun:test`.

---

## Background — read first

Three shapes exist but only ONE is genuine friction (the report over-stated "3 mirrors"):
- `StoreSettingsSchema` (zod, `src/lib/store-settings-schema.ts`) — the canonical overridable-subset (structural keys excluded, `.strict()`).
- `SettingsDraftState` (`src/lib/settings-draft.ts`) — ALREADY derives from the schema: `site: NonNullable<StoreSettings["site"]>`, `services: NonNullable<StoreSettings["services"]>`, `customCode: CustomCodeSnippet[]`. Only `SeoDraft` is distinct (because the schema's `seo`/`content` are *deliberately* loose `z.record` — do NOT change that).
- `TenantSite`/`Location`/`Service` (`src/config/types.ts`) — canonical superset; leave alone.

The real friction: `buildSparseDoc` hand-walks each field (`if (rawSite.name) site.name = ...`), duplicating the schema's field list, and its prune rule is inconsistent (site scalars use truthy `if`; `booker`/`reviews`/`geo` use `omitEmpty`). Since all site scalars are strings, and the `omitEmpty` groups already keep `0`/`false`, the unified rule below is **behavior-preserving vs the actual current code** (the header's "0 numbers → omit" claim is a wrong comment, never implemented).

**The prune rule (contract):** `pruneEmpty(v)` drops `undefined`, `null`, `""`, `[]`, `{}` (empty after recursion); KEEPS numbers (incl `0`), booleans (incl `false`), non-empty strings/arrays/objects; never mutates input.

**Three explicit filters stay** (semantic, not generic-empty):
- `hours`: keep entries with `days.length>0 && opens && closes`.
- `services`: keep items with a non-`id` value.
- `customCode`: keep rows with `code.trim() !== ""`.

The existing `src/lib/settings-draft.test.ts` (20+ tests) pins current behavior — **all must stay green** (that is the behavior-preservation proof). `buildSparseDoc(draft)` and `extractSeo(locale)` keep identical signatures.

---

## Task 1: `pruneEmpty` util

**Files:**
- Create: `src/lib/prune-empty.ts`
- Test: `src/lib/prune-empty.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/prune-empty.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { pruneEmpty } from "./prune-empty";

describe("pruneEmpty", () => {
  it("drops undefined, null, empty string", () => {
    expect(pruneEmpty(undefined)).toBeUndefined();
    expect(pruneEmpty(null)).toBeUndefined();
    expect(pruneEmpty("")).toBeUndefined();
  });

  it("keeps 0 and false (not empty)", () => {
    expect(pruneEmpty(0)).toBe(0);
    expect(pruneEmpty(false)).toBe(false);
  });

  it("keeps non-empty scalars", () => {
    expect(pruneEmpty("x")).toBe("x");
    expect(pruneEmpty(42)).toBe(42);
  });

  it("drops empty arrays and objects; keeps non-empty", () => {
    expect(pruneEmpty([])).toBeUndefined();
    expect(pruneEmpty({})).toBeUndefined();
    expect(pruneEmpty([1])).toEqual([1]);
    expect(pruneEmpty({ a: 1 })).toEqual({ a: 1 });
  });

  it("recursively drops empty leaves and collapses now-empty containers", () => {
    expect(
      pruneEmpty({ a: { b: "", c: undefined }, d: { e: "keep" }, f: [] }),
    ).toEqual({ d: { e: "keep" } });
  });

  it("prunes empty items out of arrays", () => {
    expect(pruneEmpty(["a", "", null, "b"])).toEqual(["a", "b"]);
    expect(pruneEmpty([{ x: "" }, { y: "keep" }])).toEqual([{ y: "keep" }]);
  });

  it("does not mutate the input", () => {
    const input = { a: { b: "keep", c: "" } };
    pruneEmpty(input);
    expect(input).toEqual({ a: { b: "keep", c: "" } });
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test src/lib/prune-empty.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/prune-empty.ts`:

```ts
// Recursively strip "empty" values from a plain value tree, returning a NEW value
// (never mutates the input). Empty = undefined | null | "" | [] | {} (the last two
// after recursion). KEPT = numbers (incl 0), booleans (incl false), and non-empty
// strings / arrays / objects.
//
// Used to build sparse override docs (settings-draft.ts): an absent field falls
// through to the static tenant default at the deep-merge layer, so an empty value
// must never be persisted where it would freeze over a good default.

type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function pruneEmpty<T>(value: T): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (Array.isArray(value)) {
    const arr = value
      .map((item) => pruneEmpty(item))
      .filter((item) => item !== undefined);
    return (arr.length > 0 ? arr : undefined) as T | undefined;
  }

  if (isPlainObject(value)) {
    const out: Plain = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEmpty(v);
      if (pruned !== undefined) out[k] = pruned;
    }
    return (Object.keys(out).length > 0 ? out : undefined) as T | undefined;
  }

  return value; // number (incl 0), boolean (incl false), or non-empty string
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test src/lib/prune-empty.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prune-empty.ts src/lib/prune-empty.test.ts
git commit -m "feat(config): add pruneEmpty — generic recursive sparse-prune util"
```

---

## Task 2: Refactor `buildSparseDoc` onto `pruneEmpty`; add round-trip tests

**Files:**
- Modify: `src/lib/settings-draft.ts`
- Modify: `src/lib/settings-draft.test.ts`

- [ ] **Step 1: Add round-trip + rule-pinning tests (write first)**

Append to `src/lib/settings-draft.test.ts`:

```ts
import type { StoreSettings } from "@/lib/store-settings-schema";

describe("buildSparseDoc <-> extractSeo round-trip", () => {
  it("draft seo -> doc -> draft preserves non-empty values", () => {
    const seoFr = {
      meta: { homeTitle: "H" },
      services: { "pose-ongles": { metaTitle: "T" } },
      gallery: { "nail-art-1": { alt: "A" } },
      org: { description: "O" },
    };
    const doc = buildSparseDoc({ ...empty, seoFr });
    const back = extractSeo(doc.seo?.fr as Record<string, unknown>);
    expect(back).toEqual(seoFr);
  });

  it("doc -> draft -> doc is stable (site + services + seo)", () => {
    const doc: StoreSettings = {
      site: { name: "X", geo: { lat: 46.8 } },
      services: [{ id: "pose-ongles", price: 60 }],
      seo: { fr: { meta: { homeTitle: "H" } } },
    };
    const draft = {
      site: doc.site ?? {},
      services: doc.services ?? [],
      seoFr: extractSeo(doc.seo?.fr as Record<string, unknown> | undefined),
      seoEn: extractSeo(doc.seo?.en as Record<string, unknown> | undefined),
      customCode: doc.customCode ?? [],
    };
    expect(buildSparseDoc(draft)).toEqual(doc);
  });

  it("keeps 0 and false, drops empties (unified prune rule)", () => {
    const doc = buildSparseDoc({
      ...empty,
      site: { geo: { lat: 0 }, reviews: { reviewCount: 0 } },
    });
    expect(doc.site?.geo?.lat).toBe(0);
    expect(doc.site?.reviews?.reviewCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run — the new tests should already pass on the OLD implementation**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: PASS (old code already keeps `0` via `omitEmpty` and round-trips correctly). This confirms the tests encode CURRENT behavior — the refactor in Step 3 must keep them (and all pre-existing tests) green. If the "keeps 0" test FAILS on old code, STOP and report (means current behavior differs from the Q2 contract — reconcile before refactoring).

- [ ] **Step 3: Refactor `buildSparseDoc` in `src/lib/settings-draft.ts`**

Replace the `buildSparseDoc` function body AND delete the now-unused helpers `omitEmpty`, `hasKeys`, `pruneStrings`, `pruneNested`, `buildSeoLocale`. KEEP `emptySeoDraft`, `isPlainObject` (used by `extractSeo`), and `extractSeo` (+ its internal `flat`/`nested`) unchanged. Add the import `import { pruneEmpty } from "@/lib/prune-empty";` at the top.

New `buildSparseDoc`:

```ts
/**
 * Build a sparse StoreSettings doc from the draft state. Generic value fields are
 * pruned by pruneEmpty (drop undefined/null/""/[]/{}, keep 0/false); three fields
 * keep explicit semantic filters that generic-empty can't express:
 *   - hours:      an entry is valid only with days + opens + closes
 *   - services:   an item is kept only when it carries a non-id value override
 *   - customCode: the array is source-of-truth; blank-code rows are dropped
 * The server re-validates the result via StoreSettingsSchema before writing.
 */
export function buildSparseDoc(draft: SettingsDraftState): StoreSettings {
  const doc: StoreSettings = {};

  // ── site ── generic prune of every value field EXCEPT hours (custom validity).
  const { hours, ...siteRest } = draft.site;
  const prunedSite =
    (pruneEmpty(siteRest) as NonNullable<StoreSettings["site"]> | undefined) ?? {};
  const validHours = (hours ?? []).filter(
    (h) => h.days.length > 0 && h.opens && h.closes,
  );
  if (validHours.length > 0) prunedSite.hours = validHours;
  if (Object.keys(prunedSite).length > 0) doc.site = prunedSite;

  // ── services ── keep only items with at least one non-id value override.
  const validServices = draft.services.filter((s) =>
    Object.entries(s)
      .filter(([k]) => k !== "id")
      .some(([, v]) => v !== undefined),
  );
  if (validServices.length > 0) doc.services = validServices;

  // ── seo ── generic prune of the nested SeoDraft records per locale.
  const seo: NonNullable<StoreSettings["seo"]> = {};
  const frSeo = pruneEmpty(draft.seoFr);
  if (frSeo) seo.fr = frSeo as Record<string, unknown>;
  const enSeo = pruneEmpty(draft.seoEn);
  if (enSeo) seo.en = enSeo as Record<string, unknown>;
  if (Object.keys(seo).length > 0) doc.seo = seo;

  // ── customCode ── array is source of truth; drop blank-code rows.
  const validCode = draft.customCode.filter((s) => s.code.trim() !== "");
  if (validCode.length > 0) doc.customCode = validCode;

  return doc;
}
```

Note the `hours` destructure: `hours` is `NonNullable<StoreSettings["site"]>["hours"]` — spreading `siteRest` and re-attaching `validHours` keeps types sound. If TS complains about the `pruneEmpty(siteRest)` cast, keep the `as NonNullable<...> | undefined` cast shown (siteRest omits `hours`, but the pruned result is assignable since all fields are optional).

- [ ] **Step 4: Run the full settings-draft test file**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: PASS — ALL pre-existing tests (site.name omit, valid-hours-only, services-with-value-only, seo wrap + recursive omit, booker, contact.address, geo omit/keep, widgetHost/logo/favicon, customCode) PLUS the new round-trip/rule tests. If ANY pre-existing test fails, the refactor changed behavior — fix the implementation, not the test (unless the test encoded the wrong-comment behavior, which it should not).

- [ ] **Step 5: Confirm the deleted helpers are gone and unreferenced**

Run: `grep -n "omitEmpty\|hasKeys\|pruneStrings\|pruneNested\|buildSeoLocale" src/lib/settings-draft.ts`
Expected: NO output (all replaced by `pruneEmpty`). `extractSeo`, `isPlainObject`, `emptySeoDraft` remain.

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings-draft.ts src/lib/settings-draft.test.ts
git commit -m "refactor(config): buildSparseDoc uses generic pruneEmpty; add round-trip tests"
```

---

## Task 3: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `bun test src/`
Expected: all pass, 0 fail. Report the count (baseline before C04 was 537; +7 prune-empty + ~3 round-trip = ~547).

- [ ] **Step 2: Type-check**

Run: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -vE "bun:test|Cannot find (name 'Bun'|module 'bun')"`
Expected: NO output (only pre-existing bun-env noise filtered).

- [ ] **Step 3: Production build**

Run: `bun run build`
Expected: `next build` completes; admin settings page + all routes build. (The admin write path uses `buildSparseDoc`; the build confirms no type/runtime break.)

- [ ] **Step 4: Report** final test count, tsc result, build status. No commit.

---

## Self-Review checklist (applied)

- **Spec coverage:** `pruneEmpty` util + tests (T1); `buildSparseDoc` refactor + helpers deleted + round-trip tests (T2); full verify + build (T3).
- **Behavior preservation:** ALL pre-existing `settings-draft.test.ts` tests must stay green; the unified rule matches the actual current code (site strings drop `""`; numeric groups keep `0`); the three semantic filters (hours/services/customCode) preserved explicitly; `buildSparseDoc`/`extractSeo` signatures unchanged → `SettingsForm` + admin API untouched.
- **Scope discipline (per grilling):** loose `seo`/`content` schema left as-is; `TenantSite` superset untouched; `extractSeo` unchanged.
- **No placeholders:** every step has full code + exact commands + expected output.
