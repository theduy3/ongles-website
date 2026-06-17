# Testing Patterns

**Analysis Date:** 2026-06-17

## Test Framework

**Runner:**
- `bun:test` (Bun's native test framework) — fast, zero-config, ESM-first
- Config: none required; runs `bun test src/` for unit/integration tests
- E2E tests use **Playwright** with separate config: `playwright.config.ts`

**Assertion Library:**
- `bun:test` provides `expect()` — Jest-compatible assertions
- Import: `import { expect, it, describe, test } from "bun:test"`

**Run Commands:**
```bash
bun test src/                    # Run all unit tests in src/
bun test src/ --coverage         # Unit tests with coverage report
bun test src/ --watch            # Watch mode (rerun on file change)
bunx playwright test             # Run all E2E tests (Playwright)
bunx playwright test --ui        # E2E with interactive UI mode
npm run test                     # Alias: bun test src/
```

**Current Coverage:**
- Unit tests: 148 tests passing (87.70% line coverage, 90.41% function coverage)
- Coverage report shows strong coverage in core libraries (100% in config, i18n, SEO, deepMerge)
- Weak coverage in components (Button 25.71%, SalonCard 39.29%), store-settings-store (31.48%), and proxy edge cases (61.54%)

## Test File Organization

**Location:**
- Unit tests: co-located with source files — `src/foo.ts` → `src/foo.test.ts`
- Components: same convention — `src/components/SalonCard.tsx` → `src/components/SalonCard.test.ts`
- E2E tests: separate directory — `e2e/*.spec.ts` (Playwright convention)

**Naming:**
- `*.test.ts` for bun:test unit/integration tests
- `*.spec.ts` for Playwright E2E tests (conventional in Playwright)

**Structure:**
```
src/
├── config/
│   ├── deep-merge.ts
│   ├── deep-merge.test.ts          # Unit test co-located
│   ├── resolve-tenant.test.ts
│   └── index.ts
├── lib/
│   ├── locations.ts
│   ├── locations.test.ts
│   ├── seo.ts
│   └── seo.test.ts
├── components/
│   ├── SalonCard.tsx
│   ├── SalonCard.test.ts
│   └── ClientPortalWidget.tsx      # No test (untested)
└── proxy.ts
    └── proxy.test.ts

e2e/
├── navigation.spec.ts              # Playwright E2E
├── homepage.spec.ts
├── contact-form.spec.ts
└── ...
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it } from "bun:test";

describe("deepMerge — core behavior", () => {
  it("inherits base keys the override omits", () => {
    const merged = deepMerge({ nav: { home: "Home" } }, { nav: { faq: "FAQ" } });
    expect(merged).toEqual({ nav: { home: "Home", faq: "FAQ" } });
  });

  it("does not mutate the base object", () => {
    const base = { nav: { home: "Home" } };
    deepMerge(base, { nav: { home: "Accueil" } });
    expect(base.nav.home).toBe("Home");  // Original unchanged
  });
});
```

**Patterns:**

1. **Describe blocks organize by behavior:** Group related tests under a common theme (e.g., "dependency injection", "locale routing", "validation")
   - Example: `describe("proxy — standalone un-localized pages pass through")` in `src/proxy.test.ts` line 24

2. **Test names describe the contract:** Each test is a sentence ending in period
   - Example: `it("serves /clientportal directly")` — explains what should happen
   - Example: `it("does not mutate the base object")` — verifies immutability guarantee

3. **WHY comments explain the business rule:**
   - Example in `src/config/deep-merge.test.ts` line 4-5: explains why immutability matters for dictionary composition
   - Example in `src/lib/locations.test.ts` line 16-17: explains backward-compatibility contract

4. **Setup without before/after hooks:**
   - Inline fixture creation in each test (`const merged = deepMerge(...)`)
   - No shared mutable state; each test runs independently
   - Fast iteration — no fixture teardown needed

5. **Arrange-Act-Assert implicit:**
   - Arrange: inline fixture creation or import fixtures
   - Act: function call or async operation
   - Assert: `expect()` statements

## Mocking

**Framework:** Manual mocks via dependency injection (no external mocking library)

**Patterns:**

```typescript
// Pass a test double instead of the real dependency
const injectedSite: TenantSite = {
  ...staticSite,
  name: "Z Salon",
};

const link = mapLink(location, injectedSite);  // Inject test config
expect(link).toContain("Z Salon");
```

**What to Mock:**
- Configuration overrides (tenant site, store config): inject via optional parameters
- Database/Supabase queries: tested via E2E (Playwright) against real schema
- HTTP responses: Playwright intercepts API calls with `.route()` to mock responses

**What NOT to Mock:**
- Core utility functions: test the real `deepMerge()`, not a mock
- Type guards: test actual `isLocale()` behavior
- i18n resolution: test real `matchLocale()` logic
- Library types (zod schemas): test actual validation, not mocked schemas

**Anti-pattern:** No `jest.mock()` or similar global mocking. Instead, use constructor/parameter injection or test doubles.

## Fixtures and Factories

**Test Data:**

```typescript
// src/components/SalonCard.test.ts — test double tenant configs
const TENANTS = [
  { id: "ongles-maily", cfg: onglesMaily, own: "Ongles Maily" },
  { id: "ongles-charlesbourg", cfg: onglesCharlesbourg, own: "Ongles Charlesbourg" },
] as const;

// Minimal site override — only fields tested are included
const injectedSite: TenantSite = {
  ...staticSite,
  name: "Z Salon",
  booker: { ...staticSite.booker, brand: "https://injected.booker.example.com" },
};
```

**Location:**
- Fixtures inline in test file (small, focused)
- Real tenant configs imported: `import { onglesMaily } from "@/config/tenants/ongles-maily"`
- No separate fixture directory — keep tests self-contained

## Coverage

**Requirements:** 80%+ target (current: 87.70% lines, 90.41% functions)

**View Coverage:**
```bash
bun test src/ --coverage                    # Text report in stdout
bun test src/ --coverage --coverage-reporter=lcov  # LCOV format for IDE
# Coverage written to ./coverage/
```

**Gaps (untested areas):**
- **React components:** PageHeader, CheckinWidget, QueueWidget, ClientPortalWidget, ReviewCard, etc. (no tests — pure UI)
  - Reason: UI components tested via E2E (Playwright) instead of unit tests
  - Requires interactive browser; unit tests would require React Testing Library setup
- **Layout/metadata components:** app/admin/layout.tsx, subscription/layout.tsx (66.67% function, 57.89% line coverage)
  - Partially tested in app tests; metadata generation not fully exercised
- **store-settings-store.ts:** 31.48% coverage — localStorage implementation lightly tested
  - Reason: requires DOM environment; tested via E2E instead
- **proxy.ts:** 61.54% coverage — edge cases in cookie handling (lines 22-32, 42-50) untested
  - Would require mocking iron-session unsealData; low priority

## Test Types

**Unit Tests:**
- Scope: Pure functions, utilities, type guards, configuration
- Approach: Test single functions with various inputs
- Examples:
  - `deepMerge()` tests immutability, deep recursion, array replacement
  - `isLocale()` and `matchLocale()` test i18n logic with Accept-Language headers
  - `buildSalonCards()` tests card generation for each tenant with parametrized test loops

**Integration Tests:**
- Scope: Multiple modules working together, API handlers, database operations
- Approach: Test request → response flow without mocking internals
- Examples:
  - `proxy.ts` tests routing logic: standalone pages vs locale-routed pages
  - `contact/route.ts` tests form validation → email sending (mocked provider in dev)
  - `resolve-tenant()` tests tenant registry and fallback logic
  - `seo.ts` tests SEO graph generation with dependency-injected config

**E2E Tests:**
- Framework: **Playwright** (`@playwright/test`)
- Location: `e2e/*.spec.ts`
- Config: `playwright.config.ts` (line 1-27)
  - Runs against production build: `bun run build && next start --port 3100`
  - Chrome only (chromium)
  - Retries 2x in CI, 0x locally
- Scope: Critical user flows
- Examples:
  - `navigation.spec.ts`: Navigate between pages, verify links work
  - `homepage.spec.ts`: Load homepage, verify CTAs render
  - `contact-form.spec.ts`: Fill form, intercept POST to /api/contact, verify response
  - `i18n.spec.ts`: Test locale routing, Accept-Language negotiation, language switching
  - `store-settings.spec.ts`: Test admin dashboard overrides (logo, hours, etc.)
  - `seo.spec.ts`: Verify SEO markup (JSON-LD, meta tags) on pages

## Common Patterns

**Async Testing:**

```typescript
// From src/proxy.test.ts
it("honours the accept-language header", async () => {
  const res = await proxy(req("/about", { acceptLanguage: "en-US,en;q=0.9" }));
  expect(locationOf(res)).toBe("/en/about");
});

// Async handler tests
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  const data = await unsealData(sealed, { password: secret });
  return data.authed === true;
}
```

**Error Testing:**

```typescript
// From src/config/resolve-tenant.test.ts
test("throws loudly on an unknown tenant id", () => {
  expect(() => resolveTenant("nope")).toThrow(/Unknown TENANT/);
});

// From src/app/api/contact/route.ts — validation error path
const parsed = ContactSchema.safeParse(body);
if (!parsed.success) {
  const message = parsed.error.issues[0]?.message ?? "Validation failed";
  return NextResponse.json({ success: false, error: message }, { status: 422 });
}
```

**Parametrized Tests (loop-driven):**

```typescript
// From src/components/SalonCard.test.ts
for (const { id, cfg, own } of TENANTS) {
  describe(id, () => {
    it("shows all 3 salons, no duplicates", () => {
      const names = buildSalonCards(en, "en", cfg.site, [cfg.location], id)
        .map((c) => c.name);
      expect([...names].sort()).toEqual([...ALL].sort());
    });
  });
}
// Runs same tests for each tenant config, surfacing tenant-specific bugs
```

**Testing Business Logic (WHY tests):**

Tests encode the business rule, not just behavior:

```typescript
// From src/lib/locations.test.ts
it("uses injected site.name when site arg is passed", () => {
  // WHY: DI contract — seo.ts passes cfg.site here so the map link reflects
  // the runtime-overridden brand name rather than the static default.
  const link = mapLink(loc, injectedSite);
  expect(link).toContain("Z Salon");
});

// This test would fail if a future change ignored the injected config,
// which would silently break per-tenant SEO metadata.
```

## Playwright E2E Configuration

**Test Directory:** `e2e/`

**Config File:** `playwright.config.ts`

**Key Settings:**
```typescript
testDir: "./e2e",
fullyParallel: true,           // Run all tests concurrently
retries: process.env.CI ? 2 : 0,  // Retry flaky tests 2x in CI
use: {
  baseURL: "http://localhost:3100",
  trace: "on-first-retry"       // Collect trace on retry
},
webServer: {
  command: "bun run build && ./node_modules/.bin/next start --port 3100",
  reuseExistingServer: !process.env.CI  // Reuse server locally
}
```

**Why production build:** E2E runs against `next start` (not `next dev`) to test stable, optimized code with no on-demand compilation race conditions.

**Running E2E:**
```bash
bunx playwright test             # Run all specs
bunx playwright test --ui        # Interactive mode with browser view
bunx playwright test e2e/contact-form.spec.ts  # Single spec
```

---

*Testing analysis: 2026-06-17*
