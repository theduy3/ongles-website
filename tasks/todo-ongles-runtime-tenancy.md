# Runtime Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ongles-website tenant selection happen at runtime (per-container env) so one universal image serves any tenant, fixing the all-tenants-render-maily bug.

**Architecture:** Tenant is resolved from `process.env.TENANT` in `@/config`. Extract a pure `resolveTenant()` for testability, force tenant routes to render at runtime (drop static pre-render that pins build-time tenant), and rename the server-only `NEXT_PUBLIC_SUPABASE_*` vars to plain runtime env. Dockerfile becomes tenant-agnostic; Dokploy supplies `TENANT` + `SUPABASE_*` at runtime.

**Tech Stack:** Next.js (App Router, `output: standalone`), TypeScript, Bun test (`bun test src/`), Playwright e2e (`test:e2e`), Docker, Dokploy.

**Spec:** `tasks/spec-ongles-runtime-tenancy.md`

---

### Task 1: Extract pure `resolveTenant()` (testable runtime resolution)

**Files:**
- Modify: `src/config/index.ts`
- Test: `src/config/resolve-tenant.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/config/resolve-tenant.test.ts
import { test, expect } from "bun:test";
import { resolveTenant, TENANT_REGISTRY } from "./index";

test("resolves a known tenant id", () => {
  expect(resolveTenant("ongles-charlesbourg").id).toBe("ongles-charlesbourg");
  expect(resolveTenant("ongles-rivieres").id).toBe("ongles-rivieres");
});

test("defaults to ongles-maily when undefined", () => {
  expect(resolveTenant(undefined).id).toBe("ongles-maily");
});

test("throws loudly on an unknown tenant id", () => {
  expect(() => resolveTenant("nope")).toThrow(/Unknown TENANT/);
});

test("registry contains all three live tenants + template", () => {
  expect(Object.keys(TENANT_REGISTRY).sort()).toEqual(
    ["ongles-charlesbourg", "ongles-maily", "ongles-rivieres", "template"].sort(),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/config/resolve-tenant.test.ts`
Expected: FAIL — `resolveTenant` / `TENANT_REGISTRY` not exported.

- [ ] **Step 3: Refactor `src/config/index.ts` to export the pure resolver**

Replace the resolution block (the `const registry`, `const requested`, the `if` guard, and `export const tenant`) with:

```ts
// Tenant resolver. The active tenant is selected at RUNTIME via process.env.TENANT
// (one universal image; each container sets its own TENANT). Defaults to
// "ongles-maily". Tenant-content routes are dynamic (see [lang]/layout.tsx) so
// the standalone server resolves this per deployment, not at build time.

export const TENANT_REGISTRY = {
  "ongles-maily": onglesMaily,
  "ongles-charlesbourg": onglesCharlesbourg,
  "ongles-rivieres": onglesRivieres,
  template,
} as const;

export type TenantId = keyof typeof TENANT_REGISTRY;

export function resolveTenant(requested: string | undefined) {
  const id = requested ?? "ongles-maily";
  if (!(id in TENANT_REGISTRY)) {
    // Fail loud rather than silently serving the wrong brand.
    throw new Error(
      `Unknown TENANT="${id}". Valid tenants: ${Object.keys(TENANT_REGISTRY).join(", ")}`,
    );
  }
  return TENANT_REGISTRY[id as TenantId];
}

export const tenant = resolveTenant(process.env.TENANT);
export const site = tenant.site;
export const locations = [tenant.location];
export const services = tenant.services;
```

(Keep the four tenant `import` lines at top unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/config/resolve-tenant.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
bun run typecheck   # or: npx tsc --noEmit
git add src/config/index.ts src/config/resolve-tenant.test.ts
git commit -m "refactor(config): extract pure resolveTenant for runtime tenant selection"
```

---

### Task 2: Force tenant routes to render at runtime

**Files:**
- Modify: `src/app/[lang]/layout.tsx` (around line 38, the `generateStaticParams` block)

- [ ] **Step 1: Replace static pre-render with dynamic rendering**

In `src/app/[lang]/layout.tsx`, remove the `generateStaticParams` export:

```ts
// DELETE this block:
// export function generateStaticParams() {
//   return locales.map((lang) => ({ lang }));
// }
```

and add, in its place:

```ts
// Render at runtime so the container's TENANT env selects the active brand.
// (Static pre-render would bake the build-time tenant into the HTML.)
export const dynamic = "force-dynamic";
export const dynamicParams = true;
```

- [ ] **Step 2: Verify a production build succeeds and does NOT statically pre-render tenant pages**

Run:
```bash
bun run build
```
Expected: build succeeds; in the route summary the `[lang]` routes are marked dynamic
(`ƒ` / "Dynamic") rather than static (`○`). If the build errors on
`generateStaticParams` + `force-dynamic` coexistence elsewhere, remove the stray
`generateStaticParams` from the offending route too (`src/app/[lang]/services/[slug]/page.tsx`
also has one — keep it ONLY if that route must stay static; otherwise drop it for parity).

- [ ] **Step 3: Commit**

```bash
git add src/app/[lang]/layout.tsx
git commit -m "feat: render [lang] routes dynamically so runtime TENANT selects the brand"
```

---

### Task 3: Rename server-only Supabase env vars (drop NEXT_PUBLIC_)

**Files:**
- Modify: `src/lib/supabase.ts` (lines ~9-20)
- Modify: `env.example`
- Test: `src/lib/supabase-env.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/supabase-env.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("supabase.ts reads server-only env names (no NEXT_PUBLIC_ for supabase)", () => {
  const src = readFileSync("src/lib/supabase.ts", "utf8");
  expect(src).toContain("process.env.SUPABASE_URL");
  expect(src).toContain("process.env.SUPABASE_ANON_KEY");
  expect(src).toContain("process.env.SUPABASE_TENANT_JWT");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  expect(src).not.toContain("NEXT_PUBLIC_SUPABASE_TENANT_JWT");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/supabase-env.test.ts`
Expected: FAIL — file still references `NEXT_PUBLIC_SUPABASE_*`.

- [ ] **Step 3: Rename the three vars in `src/lib/supabase.ts`**

```ts
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;   // unchanged
// ...
const tenantJwt = process.env.SUPABASE_TENANT_JWT;
```

Also update the comment line referencing the migration to drop the "NEXT_PUBLIC" wording.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/supabase-env.test.ts`
Expected: PASS.

- [ ] **Step 5: Update `env.example`**

In `env.example`, rename the three keys (strip `NEXT_PUBLIC_` prefix), keeping their example values/comments:
- `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_TENANT_JWT` → `SUPABASE_TENANT_JWT`

Add a one-line note: `# Server-only (Supabase is never used in the browser).`

- [ ] **Step 6: Grep for any other references and fix**

Run:
```bash
grep -rn "NEXT_PUBLIC_SUPABASE" src env.example Dockerfile .github 2>/dev/null
```
Expected after fixes: only `Dockerfile` / `.github/workflows/deploy.yml` may still show them — handled in Task 4. No `src/` hits remain.

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase.ts src/lib/supabase-env.test.ts env.example
git commit -m "refactor(supabase): server-only env vars (drop NEXT_PUBLIC_ from supabase keys)"
```

---

### Task 4: Make the Dockerfile tenant-agnostic

**Files:**
- Modify: `Dockerfile` (lines ~15-24)
- Modify: `.github/workflows/deploy.yml` (build-args block)

- [ ] **Step 1: Remove tenant + supabase build-args from the build stage**

In `Dockerfile`, delete the `ARG`/`ENV` lines for `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and the `ARG TENANT=ongles-maily` /
`ENV TENANT=$TENANT` pair. The build no longer needs any tenant input:

```dockerfile
# (build stage) — no TENANT / NEXT_PUBLIC_* build-args; the image is tenant-agnostic.
RUN npm run build
```

Keep `SUPABASE_SERVICE_ROLE_KEY` out of the build (it was already runtime-only).

- [ ] **Step 2: Verify the image builds tenant-agnostic and selects tenant at runtime**

Run:
```bash
docker build -t ongles-website:test .
# default (no env) -> maily
docker run --rm -e PORT=3000 -p 3010:3000 -d --name ot ongles-website:test && sleep 4
curl -s localhost:3010/en | grep -oiE "Nail Salon at [^<\"]*Québec" | head -1   # Beauport (maily default)
docker rm -f ot
# charlesbourg via runtime env, SAME image
docker run --rm -e TENANT=ongles-charlesbourg -e PORT=3000 -p 3010:3000 -d --name ot ongles-website:test && sleep 4
curl -s localhost:3010/en | grep -oiE "Nail Salon at [^<\"]*Québec" | head -1   # Carrefour Charlesbourg
docker rm -f ot
```
Expected: identical image digest, different hero per `TENANT`. THIS is the core success
proof. If charlesbourg run still shows Beauport, tenant is still build-pinned — revisit
Task 2 (dynamic rendering) before proceeding.

- [ ] **Step 3: Update `.github/workflows/deploy.yml` build-args**

Remove `TENANT`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL` from the `build-args` block (the image is now tenant-agnostic).
Leave a comment noting tenant config is runtime (Dokploy env), and that the matrix now
builds one shared image rather than per-tenant variants.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .github/workflows/deploy.yml
git commit -m "build: tenant-agnostic image (tenant + supabase config moves to runtime env)"
```

---

### Task 5: Build-once e2e guard + client-import lint guard

**Files:**
- Create: `e2e/runtime-tenancy.spec.ts`
- Create: `src/config/no-client-tenant-import.test.ts`

- [ ] **Step 1: Write the client-import guard test**

```ts
// src/config/no-client-tenant-import.test.ts
import { test, expect } from "bun:test";
import { Glob } from "bun";

// A "use client" file must not import the runtime tenant VALUE from @/config
// or its re-exports — only types. Importing the value re-pins build-time tenant
// into the client bundle (the bug this refactor fixes).
test("no client component imports the runtime tenant value", async () => {
  const offenders: string[] = [];
  const glob = new Glob("src/**/*.{ts,tsx}");
  for await (const path of glob.scan(".")) {
    const src = await Bun.file(path).text();
    if (!/^["']use client["']/m.test(src)) continue;
    // type-only imports are fine; value imports are not
    const valueImport = /import\s+(?!type\b)[^;]*from\s+["']@\/(config|lib\/site|lib\/locations)["']/;
    if (valueImport.test(src)) offenders.push(path);
  }
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run it (should already pass — guard against regressions)**

Run: `bun test src/config/no-client-tenant-import.test.ts`
Expected: PASS (current client files import only types / static JSON).

- [ ] **Step 3: Write the build-once Playwright e2e**

```ts
// e2e/runtime-tenancy.spec.ts
import { test, expect } from "@playwright/test";

// Assumes the dev/preview server under test was started with TENANT set
// (CI matrix runs this spec once per TENANT). Reads the expected hero from env.
const cases: Record<string, RegExp> = {
  "ongles-maily": /Carrefour Beauport/,
  "ongles-charlesbourg": /Carrefour Charlesbourg/,
  "ongles-rivieres": /Centre Les Rivières/,
};

test("active tenant renders its own hero", async ({ page }) => {
  const t = process.env.TENANT ?? "ongles-maily";
  await page.goto("/en");
  await expect(page.locator("body")).toContainText(cases[t]);
});
```

- [ ] **Step 4: Run e2e locally for two tenants (same build)**

Run:
```bash
TENANT=ongles-charlesbourg bun run build && TENANT=ongles-charlesbourg node .next/standalone/server.js &  # then playwright
# (Use the repo's existing e2e harness/preview command; see playwright.config.ts baseURL.)
```
Expected: PASS for charlesbourg; repeat with `TENANT=ongles-rivieres` → PASS. (Per
tasks/lessons.md: test the standalone server with `node .next/standalone/server.js`, not
`next start`, and copy static/public into standalone first.)

- [ ] **Step 5: Commit**

```bash
git add e2e/runtime-tenancy.spec.ts src/config/no-client-tenant-import.test.ts
git commit -m "test: runtime-tenancy e2e + client-import guard"
```

---

### Task 6: Full local verification + open PR

- [ ] **Step 1: Run the full suites**

```bash
bun test src/        # unit
bun run typecheck
bun run lint
bun run build        # confirm dynamic routes + green build
```
Expected: all green.

- [ ] **Step 2: Push branch + open PR**

```bash
git push -u origin <branch>
gh pr create --title "Runtime tenancy: one image, per-container TENANT" \
  --body "Implements tasks/spec-ongles-runtime-tenancy.md. Fixes all-tenants-render-maily."
```

---

### Task 7: Dokploy rollout (manual / API — NOT code; do after merge)

> Prod change. Each step is reversible by re-adding buildArgs. Confirm with owner before firing.

- [ ] **Step 1:** For each app (charlesbourg `g_DLHwfeWrb5XmNbcxh2y`, rivieres
  `15Z8FdBF_D53r4YJvCrzC`, maily `jKCF3VLE2Ni4srsBrcITl`): move `TENANT` and the renamed
  `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_TENANT_JWT` from **buildArgs →
  Environment (runtime)**; clear `buildArgs`. (Service-role key + admin secrets already in
  Environment — leave them.)
- [ ] **Step 2:** Redeploy all three apps.
- [ ] **Step 3:** Verify each domain serves its own hero + SEO:
  ```bash
  for h in onglesmaily onglescharlesbourg onglesrivieres; do
    curl -s -L "https://www.$h.com/en" | grep -oiE "Nail Salon at [^<\"]*Québec" | head -1
  done
  ```
  Expected: Beauport / Charlesbourg / Rivières respectively.
- [ ] **Step 4:** Re-screenshot all three (headless Chrome) to confirm visual differentiation.

---

## Out-of-band (track separately, not this plan)
- Rotate the GitHub PAT leaked in Dokploy build logs.
- `deploy.yml` deploys nothing (build-only) — wire or remove to avoid false success signals.
- Pending tenant-aware RLS migration is now unblocked (correct per-tenant JWT at runtime).
