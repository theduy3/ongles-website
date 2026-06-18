---
phase: 02-schema-completeness-correctness
plan: 04
type: execute
wave: 4
depends_on: ["02-03"]
files_modified:
  - src/config/schema-invariants.ts
  - src/config/seo/seo-parity.test.ts
autonomous: true
requirements: [SCHEMA-03, SCHEMA-06]
must_haves:
  truths:
    - "faqPageGraph mainEntity length equals dict.faq.items length for both FR and EN — no FAQ item silently dropped from schema"
    - "Every emitted FAQPage question/answer is non-empty (no blank q/a)"
    - "FR and EN dictionaries have identical faq.items key structure — a missing q/a key fails the build"
  artifacts:
    - path: "src/config/schema-invariants.ts"
      provides: "F-01 FAQ-count + non-empty assertion folded into assertSchemaInvariants"
      contains: "mainEntity"
    - path: "src/config/seo/seo-parity.test.ts"
      provides: "F-02 dictionary FAQ FR/EN parity block"
      contains: "faq.items"
  key_links:
    - from: "src/config/schema-invariants.ts F-01 check"
      to: "src/dictionaries/{en,fr}.json faq.items + faqPageGraph"
      via: "length + non-empty assertion per locale"
      pattern: "mainEntity\\.length"
    - from: "src/config/seo/seo-parity.test.ts"
      to: "src/dictionaries/{en,fr}.json"
      via: "keyPaths parity over faq section"
      pattern: "frDict\\.faq"
---

<objective>
Guarantee the FAQPage schema emits every FAQ item that exists in the dictionaries, with no empty questions/answers, and lock FR/EN dictionary FAQ parity into the build guard now — so Phase 3's FAQ deepening is drift-protected from day one.

Purpose: Closes SCHEMA-03 (F-01 completeness) and the parity half of SCHEMA-06 (F-02). Pulled forward from Phase 3 deliberately — a cheap test that protects future content. Depends on 02-03 because the F-01 assertion folds into the now-existing `schema-invariants.ts` module (shared file → sequential after 02-03).
Output: F-01 FAQ-count + non-empty assertion inside `assertSchemaInvariants`, and an F-02 dictionary FAQ parity block in `seo-parity.test.ts`.
</objective>

## Phase Goal (user story)

**As an** AI answer engine or searcher reading the salon's FAQ, **I want to** receive every FAQ question and answer the site publishes as structured data, in both FR and EN, with none silently dropped or blank, **so that** the salon's answers are fully retrievable and citable regardless of locale.

After this plan, a real user can: add or edit an FAQ item in `dictionaries/{en,fr}.json` and be certain it appears in the FAQPage schema (or the build fails) and that FR/EN stay in lockstep.

## Artifacts this phase produces (this plan)

- F-01 assertion inside `assertSchemaInvariants` (schema-invariants.ts): for each locale, `faqPageGraph(dict.faq.items).mainEntity.length === dict.faq.items.length`, and every `name`/`acceptedAnswer.text` non-empty.
- F-02 `describe` block in `seo-parity.test.ts`: FR/EN `faq.items` count + key-path parity (reuses existing `keyPaths`).

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-schema-completeness-correctness/02-CONTEXT.md
@.planning/phases/02-schema-completeness-correctness/02-RESEARCH.md
@.planning/phases/02-schema-completeness-correctness/02-VALIDATION.md
@.planning/phases/02-schema-completeness-correctness/02-03-SUMMARY.md

@src/config/seo/seo-parity.test.ts
@src/config/schema-invariants.ts
@src/lib/seo.ts
@src/dictionaries/en.json
@src/dictionaries/fr.json
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fold F-01 FAQ-count + non-empty assertion into assertSchemaInvariants</name>
  <read_first>
    - src/config/schema-invariants.ts (the module from 02-03 — extend, do not rebuild)
    - src/config/schema-invariants.test.ts (extend with the F-01 cases)
    - 02-RESEARCH.md §FAQ count assertion (lines 363-388 — assertFaqCount reference)
    - src/lib/seo.ts faqPageGraph (lines 299-309 — mainEntity mapping, item.q/item.a)
    - src/dictionaries/en.json + fr.json (faq.items — 11 `{ q, a }` objects each, confirmed)
  </read_first>
  <behavior>
    - Add a failing test FIRST: a synthetic dict with one item whose `a` is empty string must produce a SchemaInvariantError (non-empty check).
    - For real dictionaries: `faqPageGraph(enDict.faq.items).mainEntity.length === enDict.faq.items.length` (11) and same for FR — builder drops nothing.
    - Every `mainEntity[i].name` (question) and `acceptedAnswer.text` (answer) is a non-empty trimmed string for both locales.
  </behavior>
  <action>
    Extend `src/config/schema-invariants.ts` with an `assertFaqCount()` helper (per RESEARCH lines 363-388) and call it from `assertSchemaInvariants` / include its errors in `validateSchemaInvariants`. Import `enDict from "../dictionaries/en.json"` and `frDict from "../dictionaries/fr.json"` (resolveJsonModule is confirmed true; static imports keep the build-guard SWC require-hook happy). For each locale, build `faqPageGraph(dict.faq.items)` and assert `mainEntity.length === dict.faq.items.length`; then assert every `item.name?.trim()` and `item.acceptedAnswer?.text?.trim()` is non-empty, pushing a SchemaInvariantError on violation. Add the corresponding test cases to schema-invariants.test.ts (RED first for the empty-answer synthetic case). Keep the existing 02-03 invariants intact.
  </action>
  <verify>
    <automated>bun test src/config/schema-invariants.test.ts 2>&1 | tail -15; bun -e "import('./src/lib/seo.ts').then(async m=>{const en=(await import('./src/dictionaries/en.json',{with:{type:'json'}})).default;const g=m.faqPageGraph(en.faq.items);if(g.mainEntity.length!==en.faq.items.length)throw new Error('FAQ count mismatch: '+g.mainEntity.length+' vs '+en.faq.items.length);for(const q of g.mainEntity){if(!q.name||!q.acceptedAnswer||!q.acceptedAnswer.text)throw new Error('empty q/a')}console.log('F-01 OK: '+g.mainEntity.length+' items, all non-empty')})"</automated>
  </verify>
  <acceptance_criteria>
    - `assertSchemaInvariants`/`validateSchemaInvariants` now include the F-01 FAQ-count + non-empty check for both locales.
    - A synthetic empty-answer item is caught (negative test green-as-failure-detected).
    - `bun test src/config/schema-invariants.test.ts` green.
  </acceptance_criteria>
  <done>FAQ completeness (count parity + non-empty q/a) is enforced per locale inside the schema invariants, build-guard-wired via 02-03.</done>
</task>

<task type="auto">
  <name>Task 2: Extend seo-parity.test.ts with dictionary FAQ FR/EN parity (F-02)</name>
  <read_first>
    - src/config/seo/seo-parity.test.ts (existing `keyPaths` helper line 19; `describe` pattern)
    - 02-RESEARCH.md §FAQ parity test (lines 343-361 — import paths `../../dictionaries/`, keyPaths over faq)
    - src/dictionaries/en.json + fr.json (faq.items structure)
  </read_first>
  <action>
    Add a new `describe("Dictionary FAQ fr/en parity", ...)` block to src/config/seo/seo-parity.test.ts. Import `enDict from "../../dictionaries/en.json"` and `frDict from "../../dictionaries/fr.json"` (note the `../../dictionaries/` relative path from `src/config/seo/`). Assert `frDict.faq.items.length === enDict.faq.items.length` and `keyPaths(frDict.faq)` equals `keyPaths(enDict.faq)` (reuse the existing `keyPaths` — it recurses objects + arrays and will catch a missing `q` or `a` in any item). Do not modify the existing SEO parity blocks. This closes the silent-undefined FR FAQ gap (RESEARCH pitfall 4) before Phase 3 adds content.
  </action>
  <verify>
    <automated>grep -q 'Dictionary FAQ fr/en parity' src/config/seo/seo-parity.test.ts && grep -q "dictionaries/en.json" src/config/seo/seo-parity.test.ts && bun test src/config/seo/seo-parity.test.ts 2>&1 | tail -15 && bun test src/config/seo/seo-parity.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - New FAQ-parity describe block imports both dictionaries via `../../dictionaries/`.
    - Asserts `faq.items` count + key-path parity using the existing `keyPaths`.
    - Existing SEO parity tests untouched and still green.
    - `bun test src/config/seo/seo-parity.test.ts` green.
  </acceptance_criteria>
  <done>FR/EN dictionary FAQ parity is guarded; a missing FR `q`/`a` key now fails the test (and the build via the existing parity coverage).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| `dictionaries/{en,fr}.json` → FAQPage JSON-LD | FAQ question/answer strings reach `<script application/ld+json>` |
| FR locale file (typed from EN via `typeof en`) | Missing FR keys silently become `undefined` at runtime |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-10 | Integrity | FAQ item silently dropped or blank in schema | mitigate | F-01 count + non-empty assertion in schema-invariants (Task 1), build-guard-enforced via 02-03 |
| T-02-11 | Integrity | FR FAQ key missing → empty `acceptedAnswer.text` at runtime (silent-undefined) | mitigate | F-02 parity test catches missing FR `q`/`a` keys before deploy (Task 2) |
| T-02-12 | Tampering (XSS via JSON-LD) | FAQ q/a strings emitted into `<script application/ld+json>` | accept | Dictionary content is operator-authored static config; `JsonLd.tsx` `JSON.stringify` prevents script-context breakout for plain JSON string values |
| T-02-SC | Tampering | npm/pip/cargo installs | mitigate | No package installs in this plan (test + assertion edits only) |
</threat_model>

<verification>
- `bun test src/config/schema-invariants.test.ts` green (F-01 folded in, RED-first for empty-answer case).
- `bun test src/config/seo/seo-parity.test.ts` green (F-02 block).
- `bun test src/` full suite green.
- `next build` still passes (build guard now also enforces F-01 via 02-03 wiring).
</verification>

<success_criteria>
- SCHEMA-03: FAQPage emits every dictionary FAQ item, no empty q/a, per locale (F-01).
- SCHEMA-06 (parity half): FR/EN dictionary FAQ parity enforced (F-02), drift-protecting Phase 3.
- Site remains deployable; full suite + build green.
</success_criteria>

<output>
Create `.planning/phases/02-schema-completeness-correctness/02-04-SUMMARY.md` when done.
</output>
