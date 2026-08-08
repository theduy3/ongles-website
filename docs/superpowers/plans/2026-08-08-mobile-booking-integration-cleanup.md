# Mobile Booking Dock Integration and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the verified tenant-aware mobile booking dock into 'codex/supabase-public-read-timeout-only', clear the ConsentBanner lint gate, and remove local tooling noise without importing the unrelated homepage redesign.

**Architecture:** Treat 'codex/mobile-booking-action-dock' as the implementation source and the current 'codex/supabase-public-read-timeout-only' worktree as the integration target. Selectively cherry-pick the seven CTA implementation/test commits and the plan-alignment commit, plus a new isolated ConsentBanner lint fix; leave the source branch's homepage redesign and duplicate Supabase timeout commit out of the target. Keep '.codegraph/' and '.superpowers/' on disk but ignore them as machine-local agent state.

**Tech Stack:** Git, Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Bun 1.3.14, ESLint 9, Playwright 1.60, Tailwind CSS v4.

**Status:** Implemented and verified on 2026-08-08 in 'codex/supabase-public-read-timeout-only'.

## Global Constraints

- Target branch is 'codex/supabase-public-read-timeout-only' at '95f3a15'; preserve its existing public Supabase read-timeout fix from '105b703'.
- Source branch is 'codex/mobile-booking-action-dock' at '1fe8440'; it is clean, tracks 'origin/codex/mobile-booking-action-dock', and also contains unrelated homepage work.
- Do not cherry-pick '6cbf49' ('feat(home): redesign responsive homepage') or 'ba71358' ('fix: bound public Supabase reads during upstream outages'); the target already contains the equivalent timeout change.
- Preserve English/French dictionary key parity in 'src/dictionaries/en.json', 'src/dictionaries/fr.json', and runtime base content files.
- Run source tests with 'bun test src/' or 'bun run test'; bare 'bun test' also discovers Playwright files and produces duplicate test-registration errors.
- Preserve Consent Mode behavior: analytics is denied by default, accepted consent rehydrates GA4, declined consent stays denied, and SSR/pre-consent rendering remains safe.
- Do not delete '.codegraph/' or '.superpowers/'; they contain local agent state and generated design artifacts. Resolve their Git status by ignoring them at the repository root.
- Do not push, merge remotely, or change third-party resources as part of this plan. Stop after local commits and verification unless the user explicitly authorizes publication or merge.
- If a production build cannot fetch 'next/font/google' assets in the sandbox, rerun the same local verification with approved network access; do not replace the font implementation as part of this work.
- ESLint must ignore the repository's generated sibling worktrees via a narrow 'globalIgnores' entry for '.worktrees/**'; root 'npm run lint' must not traverse generated '.next/' output from those worktrees.

---

## Scope and File Map

The integration is intentionally split into four boundaries:

1. **Consent lint boundary:** 'src/components/ConsentBanner.tsx' keeps the banner's behavior while replacing the state update inside 'useEffect' with a hydration-safe external-store snapshot. 'src/components/ConsentBanner.test.tsx' locks the visibility decisions.
2. **CTA selection boundary:** the existing helper, labels, client island, server wiring, and responsive E2E files are selected from the source branch. Homepage files are explicitly excluded.
3. **Local-state boundary:** '.gitignore' gains repository-root ignores for '.codegraph/' and '.superpowers/'; their contents remain recoverable on disk.
4. **Lint boundary:** 'eslint.config.mjs' ignores generated sibling worktrees so the root lint command evaluates repository source rather than nested build output.
5. **Release gate boundary:** the original mobile dock plan is marked complete only after source tests, lint, full Playwright, and all three tenant builds pass.

The selected feature files are:

- 'src/lib/locations.ts' and 'src/lib/locations.test.ts' — tenant-aware Google Maps directions helper.
- 'src/config/base/content.en.json', 'src/config/base/content.fr.json', 'src/dictionaries/en.json', 'src/dictionaries/fr.json', and 'src/config/seo/seo-parity.test.ts' — compact CTA labels and locale parity.
- 'src/components/FloatingCTA.tsx', 'src/components/FloatingCTAButtons.tsx', and 'src/components/FloatingCTAButtons.test.tsx' — tenant-resolved desktop/mobile controls and booking-route guard.
- 'e2e/floating-cta.spec.ts' — responsive browser contract.
- 'docs/superpowers/plans/2026-08-07-mobile-booking-action-dock.md' — fallback clarification and final completion status.

The following source-branch files must remain absent from the target diff: 'src/app/[lang]/page.tsx', 'src/components/Header.tsx', 'src/components/Footer.tsx', 'src/components/Gallery.tsx', 'src/components/GiftCards.tsx', 'src/components/LocationsSection.tsx', 'src/components/SalonCard.tsx', 'src/components/Testimonials.tsx', 'src/components/WhyChooseUs.tsx', 'public/images/home/hygiene-detail.png', and the per-tenant SEO/content rewrites introduced by the homepage redesign.

### Task 1: Establish and lock the integration scope

**Files:**
- Read only: Git history and the two existing worktrees.

**Interfaces:**
- Consumes: target '95f3a15', source '1fe8440', and the commit list below.
- Produces: a verified selective-cherry-pick set that contains the mobile CTA only.

- [x] **Step 1: Confirm both worktrees are clean before making changes.**

Run:

~~~bash
git -C /Users/theduy/Repo/ongles-website status --short --branch
git -C /Users/theduy/Repo/ongles-website/.worktrees/mobile-booking-action-dock status --short --branch
~~~

Expected: the target reports 'codex/supabase-public-read-timeout-only' with only the known untracked '.codegraph/' and '.superpowers/' directories; the source reports 'codex/mobile-booking-action-dock' with no changes.

- [x] **Step 2: Verify the source branch's extra commits and their scopes.**

Run:

~~~bash
git -C /Users/theduy/Repo/ongles-website log --format='%h %s' 95f3a15..codex/mobile-booking-action-dock
git -C /Users/theduy/Repo/ongles-website diff --name-status 95f3a15..codex/mobile-booking-action-dock
~~~

Expected: the source contains the CTA commits '7899613', 'a87e69c', '1810f14', 'e13cb20', '886df2a', 'f7b8862', 'fe3e251', and plan commit '1fe8440', plus the excluded homepage/duplicate-timeout history. The diff includes homepage files and 'public/images/home/hygiene-detail.png', confirming that a wholesale merge is out of scope.

- [x] **Step 3: Record the exact feature commit order for cherry-picking.**

Use this order because each commit builds on the previous CTA contract:

~~~text
7899613 feat: add tenant-aware maps directions helper
a87e69c feat: add localized mobile CTA labels
1810f14 test: cover runtime mobile CTA labels
e13cb20 feat: add booking-focused mobile CTA dock
886df2a test: cover responsive floating CTA behavior
f7b8862 test: assert desktop CTA links
fe3e251 fix: harden directions fallback and CTA coverage
1fe8440 docs: align directions plan with fallback guard
~~~

Do not include the merge commit 'daccf1c', because it imports the unrelated homepage redesign and duplicate timeout history.

### Task 2: Fix ConsentBanner lint errors without changing consent behavior

**Files:**
- Modify: 'src/components/ConsentBanner.tsx:25-135'
- Modify: 'src/components/ConsentBanner.test.tsx:25-75'

**Interfaces:**
- Produces 'export type ConsentState = "accepted" | "declined" | null'.
- Produces 'shouldShowConsent(measurementId: string, readConsent: () => ConsentState): boolean'.
- Keeps 'CONSENT_KEY', 'getStoredConsent', and 'buildConsentUpdate' signatures unchanged.
- Keeps 'ConsentBanner({ measurementId, dict }: ConsentBannerProps)' unchanged for its callers.

- [x] **Step 1: Add failing pure tests for the consent-visibility decision.**

Add this suite to 'src/components/ConsentBanner.test.tsx':

~~~tsx
describe("shouldShowConsent()", () => {
  it("hides when GA4 is disabled", () => {
    expect(shouldShowConsent("", () => null)).toBe(false);
  });

  it("hides when consent was accepted", () => {
    expect(shouldShowConsent("G-TEST", () => "accepted")).toBe(false);
  });

  it("hides when consent was declined", () => {
    expect(shouldShowConsent("G-TEST", () => "declined")).toBe(false);
  });

  it("shows when consent is absent or unreadable", () => {
    expect(shouldShowConsent("G-TEST", () => null)).toBe(true);
    expect(
      shouldShowConsent("G-TEST", () => {
        throw new Error("storage unavailable");
      }),
    ).toBe(true);
  });
});
~~~

Import 'shouldShowConsent' with the existing 'CONSENT_KEY', 'getStoredConsent', and 'buildConsentUpdate' imports.

- [x] **Step 2: Run the focused test and confirm the new contract fails.**

Run:

~~~bash
cd /Users/theduy/Repo/ongles-website/.worktrees/mobile-booking-action-dock
bun test src/components/ConsentBanner.test.tsx
~~~

Expected: FAIL because 'shouldShowConsent' is not exported yet; the existing helper tests remain the regression baseline.

- [x] **Step 3: Move consent visibility out of the synchronous effect.**

In 'src/components/ConsentBanner.tsx', make these exact changes:

1. Change the React import to include 'useCallback' and 'useSyncExternalStore':

~~~tsx
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
~~~

2. Change the existing 'ConsentState' declaration near the top of the file to an exported type; do not add a second declaration. Then add the pure decision function immediately after 'buildConsentUpdate':

~~~tsx
export function shouldShowConsent(
  measurementId: string,
  readConsent: () => ConsentState,
): boolean {
  if (!measurementId) return false;
  try {
    return readConsent() === null;
  } catch {
    return true;
  }
}
~~~

3. Add the module-level subscription and snapshot helpers before 'ConsentBanner':

~~~tsx
const CONSENT_CHANGE_EVENT = "ga4-consent-change";

function subscribeToConsent(callback: () => void): () => void {
  const handleChange = () => callback();
  window.addEventListener("storage", handleChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, handleChange);
  };
}

function getConsentSnapshot(measurementId: string): boolean {
  return shouldShowConsent(measurementId, () =>
    getStoredConsent(window.localStorage),
  );
}

function getConsentServerSnapshot(): boolean {
  return false;
}

function fireConsentUpdate(accepted: boolean): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", buildConsentUpdate(accepted));
  }
}

function notifyConsentChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
  }
}
~~~

4. Replace the current 'show' state and first 'useEffect' with a server-safe external snapshot plus a dismissal state:

~~~tsx
const [dismissed, setDismissed] = useState(false);
const getSnapshot = useCallback(
  () => getConsentSnapshot(measurementId),
  [measurementId],
);
const needsConsent = useSyncExternalStore(
  subscribeToConsent,
  getSnapshot,
  getConsentServerSnapshot,
);
const show = needsConsent && !dismissed;

useEffect(() => {
  if (!measurementId) return;

  try {
    if (getStoredConsent(window.localStorage) === "accepted") {
      fireConsentUpdate(true);
    }
  } catch {
    // The snapshot already treats unavailable storage as pending consent.
  }
}, [measurementId]);
~~~

5. In both 'accept' and 'decline', dispatch the local subscription event and dismiss the banner after the storage attempt. Keep the existing storage values and GA4 call exactly as follows:

~~~tsx
function accept() {
  try {
    localStorage.setItem(CONSENT_KEY, "accepted");
  } catch {
    /* storage blocked — fire update anyway for this session */
  }
  fireConsentUpdate(true);
  notifyConsentChange();
  setDismissed(true);
}

function decline() {
  try {
    localStorage.setItem(CONSENT_KEY, "declined");
  } catch {
    /* storage blocked — consent denied by default */
  }
  // Do NOT fire a consent update — analytics_storage stays 'denied' (default).
  notifyConsentChange();
  setDismissed(true);
}
~~~

This removes the 'fireConsentUpdate' declaration-after-use error and the synchronous 'setShow(true)' effect error while preserving SSR output, storage-failure fallback, and click behavior.

- [x] **Step 4: Run the focused tests and file-level lint.**

Run:

~~~bash
cd /Users/theduy/Repo/ongles-website/.worktrees/mobile-booking-action-dock
bun test src/components/ConsentBanner.test.tsx
npx eslint src/components/ConsentBanner.tsx
~~~

Expected: all ConsentBanner tests pass and ESLint reports no errors for the component.

- [x] **Step 5: Run the source regression gate and commit the isolated fix on the source branch.**

Run:

~~~bash
cd /Users/theduy/Repo/ongles-website/.worktrees/mobile-booking-action-dock
bun test src/
npm run lint
~~~

Expected: 'bun test src/' passes 689 tests; 'npm run lint' exits successfully with only the existing unused-variable warnings in 'seo-audit/capture.mjs', 'src/config/schema-invariants.test.ts', 'src/lib/gtag.test.ts', and 'src/lib/seo.test.ts'.

Commit only the lint fix:

~~~bash
git add src/components/ConsentBanner.tsx src/components/ConsentBanner.test.tsx
git commit -m "fix: satisfy consent banner lint rules"
~~~

### Task 3: Selectively integrate the CTA commits into the target branch

**Files:**
- Add/modify only the feature files listed in the Scope and File Map section.
- Do not modify homepage redesign files during this task.

**Interfaces:**
- Consumes: the seven CTA commits, '1fe8440', and the new 'fix: satisfy consent banner lint rules' commit.
- Produces: target branch history containing the mobile dock and lint fix but not '6cbf49' or 'ba71358'.

- [x] **Step 1: Confirm the target worktree is ready for cherry-picks.**

Run from '/Users/theduy/Repo/ongles-website':

~~~bash
git branch --show-current
git status --short
git rev-parse HEAD
~~~

Expected: branch 'codex/supabase-public-read-timeout-only', 'HEAD' '95f3a15ecc4e08a964c9924d18133a66697bae42', and only '.codegraph/' and '.superpowers/' shown as untracked. Do not stage those directories.

- [x] **Step 2: Cherry-pick the feature commits in dependency order.**

Run:

~~~bash
git cherry-pick 7899613 a87e69c 1810f14 e13cb20 886df2a f7b8862 fe3e251 1fe8440
~~~

Then retrieve and cherry-pick the lint commit created in Task 2:

~~~bash
LINT_COMMIT=$(git -C /Users/theduy/Repo/ongles-website/.worktrees/mobile-booking-action-dock log -1 --format=%H --grep='fix: satisfy consent banner lint rules')
git cherry-pick "$LINT_COMMIT"
~~~

Expected: each cherry-pick applies without importing the source branch's homepage redesign. If a conflict occurs, stop the sequence, inspect the conflict, and run 'git cherry-pick --abort' before retrying with the exact CTA commit set; do not resolve a conflict by taking an entire branch side.

- [x] **Step 3: Verify the integrated file scope before running broad tests.**

Run:

~~~bash
git log --format='%h %s' 95f3a15..HEAD
git diff --name-only 95f3a15..HEAD | sort
~~~

Expected feature names are limited to:

~~~text
docs/superpowers/plans/2026-08-07-mobile-booking-action-dock.md
e2e/floating-cta.spec.ts
src/components/ConsentBanner.test.tsx
src/components/ConsentBanner.tsx
src/components/FloatingCTA.tsx
src/components/FloatingCTAButtons.test.tsx
src/components/FloatingCTAButtons.tsx
src/config/base/content.en.json
src/config/base/content.fr.json
src/config/seo/seo-parity.test.ts
src/dictionaries/en.json
src/dictionaries/fr.json
src/lib/locations.test.ts
src/lib/locations.ts
~~~

The final diff may also contain '.gitignore' after Task 4. It must not contain 'src/app/[lang]/page.tsx', 'public/images/home/hygiene-detail.png', or the homepage component/config files listed in the Scope and File Map section.

- [x] **Step 4: Run the focused integration tests.**

Run:

~~~bash
bun test src/components/ConsentBanner.test.tsx src/components/FloatingCTAButtons.test.tsx src/lib/locations.test.ts src/config/seo/seo-parity.test.ts
~~~

Expected: the ConsentBanner, route-guard, directions, analytics no-op, and FR/EN parity contracts pass with zero failures.

### Task 4: Resolve local agent artifacts safely

**Files:**
- Modify: '.gitignore'
- Leave unchanged on disk: '.codegraph/', '.superpowers/'

**Interfaces:**
- Produces: repository-root ignore rules for machine-local Codex and Superpowers state.
- Preserves: the recoverable local database, brainstorm previews, port markers, and server state.

- [x] **Step 1: Confirm neither tooling directory is tracked.**

Run:

~~~bash
git ls-files .codegraph .superpowers
~~~

Expected: no output. The directories currently contain '.codegraph/codegraph.db' and '.superpowers/brainstorm/**', all of which are local generated state.

- [x] **Step 2: Add narrow root-level ignore rules.**

Append this block to '.gitignore' after the existing scratch-research rules:

~~~gitignore

# local agent/tooling state
/.codegraph/
/.superpowers/
~~~

Do not add a broad rule for all hidden directories and do not delete the existing local files.

- [x] **Step 3: Verify the artifacts no longer pollute Git status.**

Run:

~~~bash
git check-ignore -v .codegraph/codegraph.db .superpowers/brainstorm/.last-token
git status --short
~~~

Expected: 'git check-ignore' reports the new '.gitignore' rules and 'git status --short' no longer reports either tooling directory. Stage and commit only '.gitignore':

~~~bash
git add .gitignore
git commit -m "chore: ignore local agent tooling state"
~~~

### Task 5: Run the release verification gate and close the original dock plan

**Files:**
- Modify: 'docs/superpowers/plans/2026-08-07-mobile-booking-action-dock.md' after all tests pass.
- Modify: 'eslint.config.mjs' to ignore generated sibling worktrees during root lint.

**Interfaces:**
- Consumes: the integrated target branch.
- Produces: a clean, locally verified target with the original feature plan marked complete.

- [x] **Step 1: Run all source tests with the repository's scoped command.**

Run:

~~~bash
bun test src/
~~~

Expected: 689 passing tests, zero failures, and no Playwright files loaded by Bun.

- [x] **Step 2: Run the full lint gate.**

Run:

~~~bash
npm run lint
~~~

Expected: exit code 0, no generated '.worktrees/**' diagnostics, no 'ConsentBanner.tsx' errors, and only the four pre-existing unused-variable warnings listed in Task 2.

- [x] **Step 3: Run the full production browser suite.**

Run:

~~~bash
bunx playwright test
~~~

Expected: exit code 0 with all non-skipped specs passing, including all four 'e2e/floating-cta.spec.ts' cases. The previously verified source branch produced 69 passed and 3 skipped; the target must preserve that clean result even if the exact count changes after selective integration. The Playwright web server builds the production app before running tests; allow the documented Google Fonts network fetch if the sandbox blocks it.

- [x] **Step 4: Build every live tenant sequentially.**

Run each command in order so the shared '.next/' output cannot race:

~~~bash
TENANT=ongles-maily bun run build
TENANT=ongles-charlesbourg bun run build
TENANT=ongles-rivieres bun run build
~~~

Expected for each tenant: successful compilation, TypeScript completion, and generation of all 15 static pages.

- [x] **Step 5: Inspect the final diff and working tree.**

Run:

~~~bash
git diff --check 95f3a15..HEAD
git status --short --branch
git log --format='%h %s' -14
~~~

Expected: no whitespace errors, no untracked tooling directories, only the selected CTA/ConsentBanner/ESLint-ignore/docs files in the target diff, and no homepage redesign commit in the target history.

- [x] **Step 6: Mark the original feature plan complete.**

After every preceding gate passes, use apply_patch on 'docs/superpowers/plans/2026-08-07-mobile-booking-action-dock.md' to:

1. Add this status line below the '**Tech Stack:**' paragraph:

~~~markdown
**Status:** Implemented and verified on 2026-08-08 in 'codex/supabase-public-read-timeout-only'.
~~~

2. Change every completed '- [ ]' step in that original plan to '- [x]'. Do not change the requirements, interfaces, expected test commands, or fallback behavior described there.

3. Run:

~~~bash
git diff --check
git add docs/superpowers/plans/2026-08-07-mobile-booking-action-dock.md
git commit -m "docs: mark mobile booking dock verified"
~~~

Expected: the original plan accurately records the implementation and verification state, with no source changes in this final documentation commit.
