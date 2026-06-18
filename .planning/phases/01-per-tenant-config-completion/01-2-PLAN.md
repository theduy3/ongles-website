---
phase: 01-per-tenant-config-completion
plan: 2
type: execute
wave: 2
depends_on: ["01-1"]
files_modified:
  - .planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md
  - src/config/tenants/ongles-charlesbourg/site.ts
  - src/config/tenants/ongles-charlesbourg/location.ts
  - src/config/tenants/ongles-charlesbourg/services.ts
  - src/config/tenants/ongles-rivieres/site.ts
  - src/config/tenants/ongles-rivieres/location.ts
  - src/config/tenants/ongles-rivieres/services.ts
autonomous: false
requirements: [CONFIG-01, CONFIG-02]
must_haves:
  truths:
    - "Both ongles-charlesbourg and ongles-rivieres have real (user-supplied) storeId, geo, contact email, per-service price/priceTo — no placeholders (D-03, D-04, D-06)"
    - "All 15+ secondary-tenant config TODOs are cleared (CONFIG-02)"
    - "NAP + hours are non-empty and self-consistent (hours[] FR display ↔ hoursSpec[] 24h) across both tenants (CONFIG-01, Success Criterion 1)"
    - "validateAllTenants() returns [] — the bun:test from 01-1 is now GREEN (D-09/D-10)"
    - "A clean PHASE_PRODUCTION_BUILD next build succeeds for a secondary tenant; an artificially-blanked field aborts it (build guard proven, Success Criterion 3)"
    - "Maps CID is real if a GBP exists, else documented-deferred with clean schema omission — no empty-string/placeholder linkage (D-07)"
  artifacts:
    - path: ".planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md"
      provides: "User-filled checklist; the source of every real value copied into config"
    - path: "src/config/tenants/ongles-charlesbourg/site.ts"
      provides: "Real storeId, geo, contact.email, socialProfiles (CID or deferred)"
      contains: "storeId"
    - path: "src/config/tenants/ongles-charlesbourg/services.ts"
      provides: "Charlesbourg-specific per-service price/priceTo (D-04)"
    - path: "src/config/tenants/ongles-rivieres/site.ts"
      provides: "Real storeId, geo, contact.email, socialProfiles (CID or deferred)"
      contains: "storeId"
    - path: "src/config/tenants/ongles-rivieres/services.ts"
      provides: "Rivières-specific per-service price/priceTo (D-04)"
  key_links:
    - from: "src/config/tenants/ongles-charlesbourg/location.ts"
      to: "src/config/tenants/ongles-charlesbourg/site.ts"
      via: "geo coords consistent between location.geo and site.geo"
      pattern: "geo"
    - from: "filled 01-DATA-CHECKLIST.md"
      to: "tenant config files"
      via: "execution copies checklist values verbatim (no invention — D-01)"
      pattern: "storeId|geo|price"
---

<objective>
Turn the guard GREEN by filling real per-tenant data. This plan is BLOCKED on a human
checkpoint: the user must return the filled `01-DATA-CHECKLIST.md` with real values
(SalonX storeId, exact geo coords, contact email, per-tenant prices, Maps CID if a GBP
exists). Execution then copies those values into the Charlesbourg + Rivières config files,
clears all TODOs, and confirms validateAllTenants() returns [] and a production build
succeeds.

Per D-01, Claude invents NOTHING here — no geocoding, no guessed storeId, no derived
email. Every 🔴 FILL value comes from the user; every 🟡 CONFIRM value is left as-is unless
the user corrects it; 🔵 IF-EXISTS is filled only if the user provides a CID, else
documented-deferred (D-07); ⚪ OPTIONAL gift-cert is deferred-OK (D-08).

Purpose: Satisfy CONFIG-01 + CONFIG-02 and the 4 ROADMAP Success Criteria.
Output: filled checklist + completed tenant config files; GREEN bun:test; passing build.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-per-tenant-config-completion/01-CONTEXT.md
@.planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md
@.planning/phases/01-per-tenant-config-completion/01-RESEARCH.md
# The validator + build guard this plan must turn GREEN (from 01-1):
@src/config/config-completeness.ts
@src/config/config-completeness.test.ts
# Reference tenant — match its field coverage exactly:
@src/config/tenants/ongles-maily/site.ts
@src/config/tenants/ongles-maily/services.ts
@src/config/tenants/ongles-maily/location.ts
# Files to fill (TODO markers = the field inventory):
@src/config/tenants/ongles-charlesbourg/site.ts
@src/config/tenants/ongles-charlesbourg/location.ts
@src/config/tenants/ongles-charlesbourg/services.ts
@src/config/tenants/ongles-rivieres/site.ts
@src/config/tenants/ongles-rivieres/location.ts
@src/config/tenants/ongles-rivieres/services.ts
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: BLOCKING — collect the filled data checklist from the user</name>
  <what-built>
    Plan 01-1 shipped the completeness validator + build guard; the only thing standing
    between here and a GREEN Phase 1 is real per-tenant data. Per D-01/D-02 these values are
    USER-SUPPLIED — Claude must not guess, geocode, or derive any of them.
  </what-built>
  <how-to-verify>
    1. Open `.planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md`.
    2. Fill every 🔴 FILL row for BOTH ongles-charlesbourg and ongles-rivieres:
       - SalonX storeId (real widget store code, not "OC"/"OR")
       - exact geo coords lat/lng (Google Maps → right-click pin → copy; see checklist footer)
       - public contact email (confirmed real)
       - per-service price + priceTo for all 4 services (distinct per tenant, D-04)
    3. 🟡 CONFIRM rows: confirm or correct name/address/phone/hours/widgetHost.
    4. 🔵 IF-EXISTS (Maps CID): paste the real CID if a Google Business Profile exists;
       otherwise write "no GBP yet" (Phase 1 will NOT block — D-07).
    5. ⚪ OPTIONAL gift-cert URL: fill if you have one, else leave blank (deferred-OK, D-08).
    6. Save the file and reply "checklist filled" (or paste the values).
  </how-to-verify>
  <resume-signal>Reply "checklist filled" once 01-DATA-CHECKLIST.md has every 🔴 FILL row completed for both tenants (🔵/⚪ may be "no GBP yet"/blank).</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Copy checklist values into both tenant config files; clear all TODOs</name>
  <read_first>
    .planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md (the filled values — SOURCE OF TRUTH),
    src/config/tenants/ongles-maily/{site,location,services}.ts (field coverage to match exactly),
    src/config/tenants/ongles-charlesbourg/{site,location,services}.ts (TODO markers = field inventory),
    src/config/tenants/ongles-rivieres/{site,location,services}.ts (TODO markers = field inventory),
    src/config/config-completeness.ts (the bar each filled value must satisfy)
  </read_first>
  <action>
    For BOTH ongles-charlesbourg and ongles-rivieres, copy the user's filled checklist values
    verbatim into the existing config files — fill in place, do NOT restructure the per-tenant
    file split (D-02 / established pattern). Per file:
    - site.ts: set storeId (real), geo.lat/geo.lng (exact, real), contact.email (confirmed),
      and remove each `// TODO: confirm ...` comment as the field is filled. Apply 🟡 CONFIRM
      corrections only if the user changed them.
    - location.ts: set geo.lat/geo.lng to the SAME exact coords as site.geo (key_link — must
      match). If hours were corrected, keep hours[] (FR display labels) and hoursSpec[]
      (schema.org 24h two-letter day codes) mutually consistent (RESEARCH note + established
      pattern). Remove the geo TODO.
    - services.ts: set each service's price/priceTo to the tenant-specific values from the
      checklist (D-04 — these are NOT the mirrored maily numbers). Keep the identical 4-service
      catalog and ServiceId union unchanged (D-05). Ensure priceTo >= price. Remove the
      pricing TODO.
    - Maps CID (D-07): if the user supplied a real CID, add the Google Maps URL containing
      `cid=<digits>` to socialProfiles. If "no GBP yet", leave socialProfiles as `[]` and add
      ONE short comment documenting the deferral — NO empty-string, NO placeholder entry (the
      validator's required-if-exists refine passes on an empty array; schema omits the linkage
      cleanly downstream).
    - Gift-cert (D-08): if the user supplied a URL, set booker.giftCertificate; otherwise leave
      the existing safe fallback and remove/annotate its TODO as documented-deferred. NOT a
      required-core field.
    Do NOT invent any value. If a 🔴 FILL row is still blank in the checklist, STOP and return
    to the user — do not fabricate (D-01, fail loud).
    Honoring D-01: using user-supplied values only (research/validator never derive data).
  </action>
  <files>
    src/config/tenants/ongles-charlesbourg/site.ts (modified),
    src/config/tenants/ongles-charlesbourg/location.ts (modified),
    src/config/tenants/ongles-charlesbourg/services.ts (modified),
    src/config/tenants/ongles-rivieres/site.ts (modified),
    src/config/tenants/ongles-rivieres/location.ts (modified),
    src/config/tenants/ongles-rivieres/services.ts (modified)
  </files>
  <verify>
    <automated>test -z "$(grep -rn 'TODO' src/config/tenants/ongles-charlesbourg/ src/config/tenants/ongles-rivieres/ | grep -v 'no GBP yet')" && echo "all required-core TODOs cleared"</automated>
  </verify>
  <done>
    All 15+ required-core TODOs in both tenants are cleared (CONFIG-02). storeId, geo (site +
    location matching), contact.email, and per-service price/priceTo are real user values
    (D-04, D-06). Maps CID is real or cleanly deferred (D-07); gift-cert deferred-OK (D-08).
    No fabricated values. 4-service catalog + ServiceId union unchanged (D-05).
  </done>
</task>

<task type="auto">
  <name>Task 3: Turn the guard GREEN — bun:test passes + production build succeeds, abort proven</name>
  <read_first>
    src/config/config-completeness.test.ts,
    src/config/config-completeness.ts,
    next.config.ts (the PHASE_PRODUCTION_BUILD guard from 01-1)
  </read_first>
  <action>
    Run the full config test suite and confirm validateAllTenants() now returns [] (GREEN).
    Then prove the build guard end-to-end: run a production build with PHASE_PRODUCTION_BUILD
    active for a secondary tenant and confirm it SUCCEEDS now that data is real; then prove the
    abort path by temporarily blanking one required-core field (e.g. set one geo.lat to 0 in a
    scratch edit), confirm `next build` aborts non-zero with the validator message, and REVERT
    the scratch edit immediately (surgical — leave the real value in place). Run a per-tenant
    dev sanity check (TENANT=ongles-charlesbourg and TENANT=ongles-rivieres) and confirm fully
    populated NAP + service listings render with no console warnings about missing config keys
    (Success Criterion 4). Do not commit the scratch edit.
  </action>
  <files>(no source changes — verification + transient scratch edit reverted)</files>
  <verify>
    <automated>bun test src/config/config-completeness.test.ts && TENANT=ongles-charlesbourg PHASE_PRODUCTION_BUILD=1 npm run build</automated>
  </verify>
  <done>
    `bun test src/config/config-completeness.test.ts` is fully GREEN (all tenants pass, template
    excluded). A clean PHASE_PRODUCTION_BUILD build succeeds for a secondary tenant. A blanked
    required-core field is proven to abort the build non-zero (then reverted). Per-tenant dev
    runs show populated NAP + pricing with no missing-key warnings. Success Criteria 1–4 met.
  </done>
</task>

</tasks>

<artifacts_this_phase_produces>
This plan (01-2) creates/modifies:
- `.planning/phases/01-per-tenant-config-completion/01-DATA-CHECKLIST.md` — FILLED by user (Task 1)
- `src/config/tenants/ongles-charlesbourg/site.ts` — MODIFIED (real storeId/geo/email/CID)
- `src/config/tenants/ongles-charlesbourg/location.ts` — MODIFIED (real geo, hours consistency)
- `src/config/tenants/ongles-charlesbourg/services.ts` — MODIFIED (tenant-specific pricing)
- `src/config/tenants/ongles-rivieres/site.ts` — MODIFIED (real storeId/geo/email/CID)
- `src/config/tenants/ongles-rivieres/location.ts` — MODIFIED (real geo, hours consistency)
- `src/config/tenants/ongles-rivieres/services.ts` — MODIFIED (tenant-specific pricing)

(Guard machinery created in Plan 01-1: config-completeness.ts, .test.ts, next.config.ts.)
</artifacts_this_phase_produces>

<user_checkpoint_dependency>
Task 2 and Task 3 are HARD-BLOCKED on Task 1 (the human checkpoint). No config file may be
edited with real-world values until the user returns the filled 01-DATA-CHECKLIST.md. Per
D-01, if any 🔴 FILL value is missing when Task 2 runs, execution STOPS and re-prompts the
user rather than inventing the value. This whole plan is in Wave 2 because it depends on
Plan 01-1's validator/guard AND on the human-supplied data.
</user_checkpoint_dependency>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user (offline checklist) → config files | The only source of real-world values; trusted but format-validated by the 01-1 guard |
| config files → build/deploy | Completed config crossing into Dokploy deploy; guarded by 01-1's assertAllTenantsComplete() |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04 | Tampering | fabricated/guessed config values entering the repo | mitigate | D-01 enforced: only user-checklist values copied; Task 2 STOPs on any blank 🔴 row (fail loud); validator rejects placeholders |
| T-01-05 | Information Disclosure | wrong geo/NAP shipped for a tenant (cross-tenant bleed) | mitigate | site.geo ↔ location.geo consistency check; per-tenant dev sanity run (Success Criterion 4); validator runs all tenants |
| T-01-06 | Tampering | scratch "blank a field" abort-proof left in the tree | mitigate | Task 3 reverts the transient edit immediately; verify cmd ends on a clean real-data build |
| T-01-SC | Tampering | npm/pip/cargo installs | accept | No new packages installed this plan (no install tasks). No legitimacy checkpoint needed. |
</threat_model>

<verification>
- `bun test src/config/config-completeness.test.ts` — fully GREEN.
- `TENANT=ongles-charlesbourg PHASE_PRODUCTION_BUILD=1 npm run build` and same for ongles-rivieres — both succeed.
- Blank-a-field abort proven non-zero, then reverted.
- `grep -rn 'TODO' src/config/tenants/ongles-charlesbourg/ src/config/tenants/ongles-rivieres/` — no required-core TODOs remain.
- Per-tenant dev runs: populated NAP + pricing, no missing-config-key console warnings.
</verification>

<success_criteria>
Maps to the 4 ROADMAP Success Criteria + CONFIG-01/02 + D-06 bar:
- SC1 (NAP+hours non-empty, consistent across surfaces): CONFIG-01 — filled, hours[]↔hoursSpec[] consistent, dev-verified.
- SC2 (complete service menu, ≥1 price each, 15+ TODOs resolved): CONFIG-02 — per-tenant prices filled, all TODOs cleared.
- SC3 (no placeholder/empty/undefined fallback): D-06/D-07/D-08 — validator GREEN; build-abort path proven.
- SC4 (TENANT=secondary dev run fully populated, no missing-key warnings): dev sanity run for both secondary tenants.
</success_criteria>

<output>
Create `.planning/phases/01-per-tenant-config-completion/01-2-SUMMARY.md` when done.
</output>
