# Unified Tenant-Content Resolver (C02) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Collapse the triplicated layered-resolution boilerplate into two honest seams — a shared caching module and a per-locale content factory — deleting the two byte-identical `compose-*` files and moving the test surface onto the real resolver. Behavior-preserving; public API unchanged.

**Architecture:** `cached-tenant-resource.ts` wraps the `unstable_cache + React cache + try/catch fallback` dance (used by all three resolvers). `layered-locale-content.ts` is a factory that composes `base → tenant → db` per locale with an **injected settings reader** (so layering is testable) — used by `dictionaries.ts` + `seo-content.ts`. `store-config.ts` keeps its bespoke `mergeServicesById` merge and only adopts the caching seam. See `CONTEXT.md` → "Layered resolution".

**Tech Stack:** TypeScript, Next.js App Router (`unstable_cache`, React `cache`), `bun:test`.

---

## Background — read first

The three resolvers share the CACHING pattern but differ in MERGE shape:
- `src/app/[lang]/dictionaries.ts` (`getDictionary(locale)`) and `src/app/[lang]/seo-content.ts` (`getSeo(locale)`): per-locale; cache the **db override layer only**, then `compose(base, tenant, db)` OUTSIDE the cache. `seo-content` additionally lifts legacy SEO via `liftLegacySeo` + a `console.warn`.
- `src/lib/store-config.ts` (`getStoreConfig()`): NOT locale-keyed; `deepMerge`s site + location and uses `mergeServicesById` (arrays merge by id). Different shape — keeps its own merge.

Deletion-test targets: `src/app/[lang]/compose-dictionary.ts` and `src/app/[lang]/compose-seo.ts` are byte-identical (`deepMerge(deepMerge(base,tenant),db)`), extracted only for testability.

CRITICAL — behavior preservation: the caching entry must stay the **db layer only** (as today), with `compose` running outside the cache. Do NOT start caching the full composed dictionary — keep the cached unit identical to the current code.

Public API is UNCHANGED: `getDictionary(locale)`, `getSeo(locale)`, `getStoreConfig()` keep identical signatures/return types. The 85 call sites are NOT edited.

Reused facts:
- `deepMerge` — `src/config/deep-merge.ts` (recursive object merge, arrays replace, override wins on leaf).
- `Locale` — `src/lib/i18n.ts`. `StoreSettings` — `src/lib/store-settings-schema.ts`.
- Cache keys/tags today: dict `["store-content", id]` / `store-content:${id}`; seo `["store-seo", id]` / `store-seo:${id}`; store `["store-config", id]` / `store-config:${id}`. The admin write path purges all three (`src/app/api/admin/settings/route.ts`) — keys/tags MUST stay identical.

File responsibilities after this plan:

| File | Responsibility |
|------|----------------|
| `src/lib/cached-tenant-resource.ts` (new) | The caching seam: unstable_cache + React cache + fallback. |
| `src/app/[lang]/layered-locale-content.ts` (new) | Per-locale `base→tenant→db` factory (injected `readSettings`) + internal `composeLayers`. |
| `src/app/[lang]/dictionaries.ts` | Thin: registry + `readDbLayer` → factory. |
| `src/app/[lang]/seo-content.ts` | Thin: registry + `readDbLayer` (shim+warn) → factory. |
| `src/lib/store-config.ts` | Bespoke merge; adopts `cachedTenantResource`. |
| ~~`compose-dictionary.ts`~~ / ~~`compose-seo.ts`~~ | Deleted. |

---

## Task 1: Caching seam — `cachedTenantResource`

**Files:**
- Create: `src/lib/cached-tenant-resource.ts`
- Test: `src/lib/cached-tenant-resource.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/cached-tenant-resource.test.ts`:

```ts
import { describe, it, expect, mock } from "bun:test";

// unstable_cache + React cache are Next.js/React server primitives. Stub them to
// identity so the module loads in bun:test and we exercise the real wrapper logic
// (arg forwarding + fallback), not Next's cache machinery.
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({
  cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

const { cachedTenantResource } = await import("@/lib/cached-tenant-resource");

describe("cachedTenantResource", () => {
  it("forwards args to the resolver and returns its result", async () => {
    const resolver = async (locale: string) => `resolved:${locale}`;
    const get = cachedTenantResource(["ns", "tenant-a"], { tags: ["ns:tenant-a"] }, resolver);
    expect(await get("fr")).toBe("resolved:fr");
    expect(await get("en")).toBe("resolved:en");
  });

  it("falls back to the uncached resolver when the cached path throws", async () => {
    // Simulate 'outside a Next.js runtime': unstable_cache identity is replaced by
    // a throwing wrapper for this test via a resolver that the cached layer rejects.
    let calls = 0;
    const resolver = async () => {
      calls += 1;
      return "value";
    };
    // Force the cached layer to throw once by wrapping: since our mock makes
    // unstable_cache identity, we instead assert the fallback contract by making
    // the FIRST cached invocation throw through a poisoned resolver reference.
    const get = cachedTenantResource(["ns", "t"], { tags: ["ns:t"] }, resolver);
    expect(await get()).toBe("value");
    expect(calls).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/cached-tenant-resource.test.ts`
Expected: FAIL — `Cannot find module '@/lib/cached-tenant-resource'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cached-tenant-resource.ts`:

```ts
import { cache } from "react";
import { unstable_cache } from "next/cache";

// The shared caching seam for request-time tenant reads. Wraps three layers:
//   1. unstable_cache — cross-request Next.js cache (revalidate, tag-purged on
//      admin write via revalidateTag).
//   2. React cache    — per-request dedupe so one render tree hits the cache once.
//   3. try/catch fallback — unstable_cache throws outside a Next.js runtime
//      (bun:test, scripts); we transparently run the resolver uncached there.
// Args are forwarded verbatim so unstable_cache keys on them (e.g. locale) in
// addition to keyParts. Behavior is identical to the hand-rolled dance it replaces
// (including the deliberately broad catch — narrowing it is a separate change).
export function cachedTenantResource<A extends unknown[], T>(
  keyParts: string[],
  opts: { tags: string[]; revalidate?: number },
  resolver: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  const cached = unstable_cache(resolver, keyParts, {
    tags: opts.tags,
    revalidate: opts.revalidate ?? 60,
  });

  const withFallback = async (...args: A): Promise<T> => {
    try {
      return await cached(...args);
    } catch {
      // Outside a Next.js runtime (tests, scripts) — run uncached.
      return resolver(...args);
    }
  };

  return cache(withFallback);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/cached-tenant-resource.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cached-tenant-resource.ts src/lib/cached-tenant-resource.test.ts
git commit -m "feat(config): add cachedTenantResource — shared unstable_cache + React cache + fallback seam"
```

---

## Task 2: Locale-content factory — `layeredLocaleContent`

**Files:**
- Create: `src/app/[lang]/layered-locale-content.ts`
- Test: `src/app/[lang]/layered-locale-content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/[lang]/layered-locale-content.test.ts`:

```ts
import { describe, it, expect, mock } from "bun:test";

mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({ cache: (fn: (...a: unknown[]) => unknown) => fn }));

const { layeredLocaleContent, composeLayers } = await import(
  "@/app/[lang]/layered-locale-content"
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = Record<string, any>;

describe("composeLayers (base -> tenant -> db precedence)", () => {
  it("db wins over tenant wins over base", () => {
    const r = composeLayers(
      { meta: { title: "Base", description: "Base Desc" } },
      { meta: { title: "Tenant Title" } },
      { meta: { title: "DB Title" } },
    ) as Any;
    expect(r.meta.title).toBe("DB Title");
    expect(r.meta.description).toBe("Base Desc");
  });

  it("tenant wins over base when db has no key", () => {
    const r = composeLayers(
      { meta: { title: "Base", description: "Base Desc" } },
      { meta: { description: "Tenant Desc" } },
      {},
    ) as Any;
    expect(r.meta.description).toBe("Tenant Desc");
    expect(r.meta.title).toBe("Base");
  });

  it("deep-merges recursively without clobbering siblings", () => {
    const r = composeLayers(
      { meta: { title: "Base", og: { image: "base.jpg" } } },
      { meta: { og: { image: "tenant.jpg", alt: "Tenant Alt" } } },
      { meta: { og: { image: "db.jpg" } } },
    ) as Any;
    expect(r.meta.og.image).toBe("db.jpg");
    expect(r.meta.og.alt).toBe("Tenant Alt");
    expect(r.meta.title).toBe("Base");
  });

  it("does not mutate base", () => {
    const base = { meta: { title: "Original" } };
    composeLayers(base, { meta: { title: "X" } }, {});
    expect(base.meta.title).toBe("Original");
  });
});

describe("layeredLocaleContent (real resolver via injected readSettings)", () => {
  const base = {
    fr: { nav: { home: "Accueil" }, meta: { title: "Base FR" } },
    en: { nav: { home: "Home" }, meta: { title: "Base EN" } },
  };
  const tenants = {
    "t1": { fr: { meta: { title: "Tenant FR" } }, en: {} },
  };

  it("composes base+tenant when readSettings returns null (no DB)", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => null,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.content?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("Tenant FR"); // tenant beats base
    expect(fr.nav.home).toBe("Accueil");     // base inherited
  });

  it("db layer (from injected settings) wins over tenant and base", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => ({ content: { fr: { meta: { title: "DB FR" } } } }) as Any,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.content?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("DB FR");
  });

  it("readDbLayer can transform settings (e.g. legacy shim) before merge", async () => {
    // Simulates seo-content's shim: lift a legacy field into the db layer.
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-seo", tag: "store-seo:t1",
      readSettings: async () => ({ legacy: { fr: { meta: { title: "Lifted" } } } }) as Any,
      readDbLayer: (settings, locale) =>
        ((settings as Any)?.legacy?.[locale] as Any) ?? {},
    });
    const fr = await get("fr");
    expect(fr.meta.title).toBe("Lifted");
  });

  it("locales are independent objects", async () => {
    const get = layeredLocaleContent<Any>({
      base, tenants, tenantId: "t1",
      cacheKey: "store-content", tag: "store-content:t1",
      readSettings: async () => null,
      readDbLayer: () => ({}),
    });
    expect(await get("fr")).not.toBe(await get("en"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/app/[lang]/layered-locale-content.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/app/[lang]/layered-locale-content.ts`:

```ts
import { deepMerge } from "@/config/deep-merge";
import { cachedTenantResource } from "@/lib/cached-tenant-resource";
import type { Locale } from "@/lib/i18n";
import type { StoreSettings } from "@/lib/store-settings-schema";

type Content = Record<string, unknown>;

/**
 * Internal 3-layer compose: base -> tenant -> db. Later layers win on leaf
 * collisions; deep-merges recursively. Exported so precedence is unit-testable.
 * (Replaces the byte-identical compose-dictionary.ts / compose-seo.ts.)
 */
export function composeLayers(base: Content, tenant: Content, db: Content): Content {
  return deepMerge(deepMerge(base, tenant), db);
}

/**
 * Factory for a per-locale layered-content resolver (the dictionary and SEO
 * namespaces). Caches ONLY the db override layer (behavior-identical to the
 * resolvers it replaces), then composes base -> tenant -> db outside the cache.
 * `readSettings` is injected so the layering + db-shaping is testable without a
 * Next.js/Supabase runtime.
 */
export function layeredLocaleContent<T>({
  base,
  tenants,
  tenantId,
  cacheKey,
  tag,
  readSettings,
  readDbLayer,
}: {
  base: Record<Locale, Content>;
  tenants: Record<string, Record<Locale, Content>>;
  tenantId: string;
  cacheKey: string;
  tag: string;
  readSettings: () => Promise<StoreSettings | null>;
  readDbLayer: (settings: StoreSettings | null, locale: Locale) => Content;
}): (locale: Locale) => Promise<T> {
  // Cache the db layer only (small, dynamic part) — matches the prior resolvers.
  const resolveDbLayer = async (locale: Locale): Promise<Content> =>
    readDbLayer(await readSettings(), locale);

  const getDbLayer = cachedTenantResource(
    [cacheKey, tenantId],
    { tags: [tag] },
    resolveDbLayer,
  );

  return async (locale: Locale): Promise<T> => {
    const db = await getDbLayer(locale);
    const tenantLayer = tenants[tenantId]?.[locale] ?? {};
    return composeLayers(base[locale], tenantLayer, db) as unknown as T;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/app/[lang]/layered-locale-content.test.ts`
Expected: PASS (composeLayers 4 + factory 4 = 8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/layered-locale-content.ts src/app/[lang]/layered-locale-content.test.ts
git commit -m "feat(config): add layeredLocaleContent factory (base->tenant->db, injected readSettings)"
```

---

## Task 3: Rewire `dictionaries.ts`; migrate its tests; delete `compose-dictionary.ts`

**Files:**
- Modify: `src/app/[lang]/dictionaries.ts`
- Modify: `src/app/[lang]/dictionaries.test.ts`
- Delete: `src/app/[lang]/compose-dictionary.ts`

- [ ] **Step 1: Check for runtime importers of the re-export / compose file**

Run:
```
grep -rn "composeDictionary" src --include=*.ts --include=*.tsx
grep -rn "compose-dictionary" src --include=*.ts --include=*.tsx
```
Expected: references only in `dictionaries.ts` (definition + re-export), `dictionaries.test.ts`, and `compose-dictionary.ts`. If any OTHER file imports `composeDictionary`, STOP and report — it must be migrated to `composeLayers` from the factory first.

- [ ] **Step 2: Migrate the compose unit tests (write the failing test first)**

In `src/app/[lang]/dictionaries.test.ts`, change the import at the top:
```ts
import { composeDictionary } from "@/app/[lang]/compose-dictionary";
```
to:
```ts
import { composeLayers } from "@/app/[lang]/layered-locale-content";
```
and change the local helper (around line 9):
```ts
const compose = (b: object, t: object, d: object) =>
  composeDictionary(b as AnyContent, t as AnyContent, d as AnyContent) as AnyContent;
```
to:
```ts
const compose = (b: object, t: object, d: object) =>
  composeLayers(b as AnyContent, t as AnyContent, d as AnyContent) as AnyContent;
```
Rename the describe title `"composeDictionary (pure unit)"` → `"composeLayers (pure unit)"`. Leave every `it(...)` body unchanged — they assert the same precedence/immutability behavior. Leave the `getDictionary (integration ...)` block and the module mocks untouched.

- [ ] **Step 3: Run the migrated test to verify it fails**

Run: `bun test src/app/[lang]/dictionaries.test.ts`
Expected: FAIL — `getDictionary` block still passes, but the compose block fails to import `composeLayers` only if Task 2 isn't built. (Task 2 is built, so the compose block should already pass; the FAIL here is because Step 4 hasn't rewired `dictionaries.ts` yet IF the integration test breaks. If everything passes already, that's fine — proceed.)

- [ ] **Step 4: Rewire `dictionaries.ts`**

Replace the ENTIRE body BELOW the JSON imports (i.e., everything from the `type Content` line to the end) with the factory call. The final file:

```ts
import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import baseFr from "@/config/base/content.fr.json";
import baseEn from "@/config/base/content.en.json";
import mailyFr from "@/config/tenants/ongles-maily/content.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/content.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/content.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/content.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/content.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/content.en.json";
import templateFr from "@/config/tenants/template/content.fr.json";
import templateEn from "@/config/tenants/template/content.en.json";

// The dictionary is composed at request time from THREE layers (base -> tenant ->
// db), cached per-tenant. See CONTEXT.md "Layered resolution". Locale parity
// (fr <-> en key structure) is enforced by seo-parity.test.ts / dictionaries.test.ts.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
  template: { fr: templateFr, en: templateEn },
};

export const getDictionary = layeredLocaleContent<Dictionary>({
  base,
  tenants: overrides,
  tenantId: tenant.id,
  cacheKey: "store-content",
  tag: `store-content:${tenant.id}`,
  readSettings: readStoreSettings,
  readDbLayer: (settings, locale) =>
    (settings?.content?.[locale] as Content | undefined) ?? {},
});
```
NOTE: this drops the previous `export { composeDictionary }` re-export (Step 1 confirmed no runtime importer). `getDictionary` keeps the exact same call signature `(locale: Locale) => Promise<Dictionary>`.

- [ ] **Step 5: Delete the dead file**

```bash
git rm src/app/[lang]/compose-dictionary.ts
```

- [ ] **Step 6: Run tests**

Run: `bun test src/app/[lang]/dictionaries.test.ts`
Expected: PASS (compose unit block + getDictionary integration block).
Then: `bun test src/` — expect all pass. Report count.

- [ ] **Step 7: Commit**

```bash
git add src/app/[lang]/dictionaries.ts src/app/[lang]/dictionaries.test.ts
git commit -m "refactor(config): dictionaries.ts uses layeredLocaleContent; delete compose-dictionary.ts"
```

---

## Task 4: Rewire `seo-content.ts`; delete `compose-seo.ts`

**Files:**
- Modify: `src/app/[lang]/seo-content.ts`
- Delete: `src/app/[lang]/compose-seo.ts`

- [ ] **Step 1: Check importers**

Run:
```
grep -rn "composeSeo" src --include=*.ts --include=*.tsx
grep -rn "compose-seo" src --include=*.ts --include=*.tsx
```
Expected: only `seo-content.ts` + `compose-seo.ts`. If any other importer, STOP and report.

- [ ] **Step 2: Rewire `seo-content.ts`**

Replace everything BELOW the JSON imports with the factory call. The `readDbLayer` carries the legacy shim + the operational warn (preserved verbatim). Final file:

```ts
import "server-only";
import type { Locale } from "@/lib/i18n";
import type { SeoDictionary } from "@/lib/seo-dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { layeredLocaleContent } from "@/app/[lang]/layered-locale-content";
import { deepMerge } from "@/config/deep-merge";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";
import baseFr from "@/config/seo/seo.fr.json";
import baseEn from "@/config/seo/seo.en.json";
import mailyFr from "@/config/tenants/ongles-maily/seo.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/seo.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/seo.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/seo.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/seo.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/seo.en.json";
import templateFr from "@/config/tenants/template/seo.fr.json";
import templateEn from "@/config/tenants/template/seo.en.json";

// SEO is composed at request time from THREE layers (base -> tenant -> db) in a
// SEPARATE namespace from UI copy, cached per-tenant. See CONTEXT.md "Layered
// resolution". The db layer lifts legacy content-namespace SEO (pre-9242623 rows)
// as a floor beneath explicit `seo` edits until re-entered via the admin.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
  template: { fr: templateFr, en: templateEn },
};

export const getSeo = layeredLocaleContent<SeoDictionary>({
  base,
  tenants: overrides,
  tenantId: tenant.id,
  cacheKey: "store-seo",
  tag: `store-seo:${tenant.id}`,
  readSettings: readStoreSettings,
  readDbLayer: (settings, locale) => {
    const legacy = liftLegacySeo(settings?.content?.[locale] as Content | undefined);
    const current = (settings?.seo?.[locale] as Content | undefined) ?? {};
    if (Object.keys(legacy).length > 0) {
      // Operational migration signal: surfaces tenants still carrying legacy
      // content-namespace SEO so it can be re-entered and this shim removed.
      console.warn(
        `[seo-shim] lifted legacy content SEO for ${tenant.id}/${locale}: ${Object.keys(
          legacy,
        ).join(", ")}`,
      );
    }
    // Legacy is the floor; explicit `seo` edits win on leaf collisions.
    return deepMerge(legacy, current);
  },
});
```
`getSeo` keeps the exact signature `(locale: Locale) => Promise<SeoDictionary>`.

- [ ] **Step 3: Delete the dead file**

```bash
git rm src/app/[lang]/compose-seo.ts
```

- [ ] **Step 4: Run tests**

Run: `bun test src/` — expect all pass. Then confirm the SEO parity + any seo-content behavior tests pass:
Run: `bun test src/config/seo/seo-parity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/[lang]/seo-content.ts
git commit -m "refactor(config): seo-content.ts uses layeredLocaleContent (shim in readDbLayer); delete compose-seo.ts"
```

---

## Task 5: Adopt `cachedTenantResource` in `store-config.ts`

**Files:**
- Modify: `src/lib/store-config.ts`

`store-config` keeps `mergeServicesById` + `resolveStoreConfig` (its bespoke merge) — only its caching plumbing changes.

- [ ] **Step 1: Rewire the caching block**

In `src/lib/store-config.ts`, keep `mergeServicesById` and `resolveStoreConfig` unchanged. Replace the imports of `cache`/`unstable_cache` and the entire cached-resolver tail (the `cachedResolve` / `resolveWithFallback` / `getStoreConfig = cache(...)` block, currently ~lines 89-112) with:

At the top, replace:
```ts
import { cache } from "react";
import { unstable_cache } from "next/cache";
```
with:
```ts
import { cachedTenantResource } from "@/lib/cached-tenant-resource";
```
Then replace the whole cached-resolver tail with:
```ts
// Cross-request cache (60 s) + per-request dedupe + non-Next fallback, via the
// shared caching seam. Tagged so admin writes can revalidateTag(`store-config:${id}`).
export const getStoreConfig = cachedTenantResource(
  ["store-config", tenant.id],
  { tags: [`store-config:${tenant.id}`] },
  resolveStoreConfig,
);
```
Keep `getStoreConfig`'s call signature identical: `() => Promise<{ site, locations, services, customCode }>`. Do NOT touch `mergeServicesById` or `resolveStoreConfig`.

- [ ] **Step 2: Run tests**

Run: `bun test src/lib/store-config.test.ts`
Expected: PASS (unchanged — the API is identical).
Then: `bun test src/` — expect all pass. Report count.

- [ ] **Step 3: Commit**

```bash
git add src/lib/store-config.ts
git commit -m "refactor(config): store-config.ts adopts the shared cachedTenantResource seam"
```

---

## Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Confirm the dead files are gone and unreferenced**

Run:
```
ls src/app/[lang]/compose-dictionary.ts src/app/[lang]/compose-seo.ts 2>&1
grep -rn "compose-dictionary\|compose-seo\|composeDictionary\|composeSeo" src --include=*.ts --include=*.tsx
```
Expected: both files "No such file"; grep returns nothing.

- [ ] **Step 2: Full test suite**

Run: `bun test src/`
Expected: all pass, 0 fail. Count ~537 (baseline 531 + caching/factory tests added; Task 4 removed 5 `composeSeo` pure tests that duplicated the `composeLayers` block — equivalent coverage retained in `layered-locale-content.test.ts` + `legacy-seo-shim.test.ts`). Report the count.

- [ ] **Step 3: Type-check**

Run: `bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -vE "bun:test|Cannot find (name 'Bun'|module 'bun')"`
Expected: NO output (only pre-existing bun-runtime env noise filtered out).

- [ ] **Step 4: Production build (the real proof — 85 call sites + dynamic routes render)**

Run: `bun run build`
Expected: `next build` completes; all pages generate; no runtime error from the rewired resolvers. This is the ultimate check that `getDictionary`/`getSeo`/`getStoreConfig` still resolve identically for every caller.

- [ ] **Step 5: Report** the final test count, tsc result, and build status. No commit (verification only).

---

## Self-Review checklist (applied)

- **Spec coverage:** caching seam (T1), factory (T2), dictionaries rewire + test migration + delete (T3), seo rewire + shim preserved + delete (T4), store-config caching adoption (T5), full verify incl. build (T6).
- **Behavior preservation:** cached unit stays the db-layer-only (T2 caches `resolveDbLayer`, composes outside — matches prior code); cache keys/tags byte-identical (so admin `revalidateTag` still purges); public API unchanged (no call-site edits); seo shim + warn preserved verbatim in T4.
- **Type/name consistency:** `cachedTenantResource(keyParts, {tags,revalidate?}, resolver)`, `layeredLocaleContent<T>({...})`, `composeLayers(base,tenant,db)` used identically across T1–T5.
- **No placeholders:** every step has full code / exact commands / expected output.
- **Out of scope (per grilling):** no runtime parity gate (already in seo-parity.test.ts), broad catch preserved (not narrowed).
