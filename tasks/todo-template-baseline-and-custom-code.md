<!-- s1 metadata
task-name: template-baseline-and-custom-code
scope: medium
status: plan-approved
repo: /Users/theduy/Repo/ongles-website
created-at: 2026-06-06
-->

# Template Baseline + Admin Custom Code Injection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repo a clean deployable default template (neutral `template` tenant) and give the admin full control over embedded third-party code — a configurable SalonX widget host plus arbitrary per-page custom-code injection.

**Architecture:** Bolt onto the existing sparse-override layer. `widgetHost` joins the `site` namespace; a new top-level `customCode` array carries admin-authored snippets. Both flow through `StoreSettingsSchema` → `buildSparseDoc` → settings API → `revalidateTag` → `getStoreConfig()`. Snippets are injected client-side via `Range.createContextualFragment` (executes pasted `<script>`; `dangerouslySetInnerHTML` would not) inside a `CustomCodeHost` rendered only under the `[lang]` layout.

**Tech Stack:** Next.js 16 (App Router), React 19, Zod 4, Supabase, bun:test, Playwright.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/config/types.ts` | add `widgetHost` to `TenantSite` |
| `src/config/tenants/*/site.ts` | set `widgetHost` (all tenants incl. new template) |
| `src/lib/store-settings-schema.ts` | `site.widgetHost` + top-level `customCode` array + `CustomCodeSnippet` type |
| `src/lib/route-key.ts` (new) | `routeKeyFromPathname` + `snippetMatchesKey` pure helpers |
| `src/lib/store-config.ts` | resolver returns `customCode` |
| `src/lib/settings-draft.ts` | draft state + sparse build for `widgetHost` + `customCode` |
| `src/components/CustomCodeHost.tsx` (new) | client injector via `createContextualFragment` |
| `src/app/[lang]/layout.tsx` | render `<CustomCodeHost>` |
| `src/components/{BookingWidget,CheckinWidget,QueueWidget}.tsx` | `widgetHost` prop |
| `src/app/[lang]/book-online/page.tsx`, `src/app/checkin/page.tsx`, `src/app/queue/page.tsx` | pass `widgetHost` |
| `src/components/admin/settings/BrandSeoSection.tsx` | Widget host field |
| `src/components/admin/settings/CustomCodeSection.tsx` (new) | snippet editor |
| `src/components/admin/SettingsForm.tsx` | wire customCode |
| `src/config/tenants/template/*` (new) | neutral tenant |
| `src/config/index.ts` | register `template` |
| `package.json`, `README.md` | rename + docs |
| `e2e/custom-code.spec.ts` (new) | injection E2E |

---

## Task 1: `widgetHost` on the site type + schema + sparse builder

**Files:**
- Modify: `src/config/types.ts` (TenantSite)
- Modify: `src/config/tenants/ongles-maily/site.ts`, `src/config/tenants/ongles-charlesbourg/site.ts`, `src/config/tenants/ongles-rivieres/site.ts`
- Modify: `src/lib/store-settings-schema.ts` (SiteSectionSchema)
- Modify: `src/lib/settings-draft.ts` (buildSparseDoc)
- Test: `src/lib/store-settings-schema.test.ts`, `src/lib/settings-draft.test.ts`

- [ ] **Step 1: Failing schema test**

In `src/lib/store-settings-schema.test.ts` add:

```ts
test("site.widgetHost is accepted", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { widgetHost: "https://app.example.com" },
  });
  expect(r.success).toBe(true);
});
```

- [ ] **Step 2: Run — expect FAIL** (`.strict()` rejects unknown key)

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: FAIL (`Unrecognized key "widgetHost"`).

- [ ] **Step 3: Add `widgetHost` to `SiteSectionSchema`**

In `src/lib/store-settings-schema.ts`, inside `SiteSectionSchema` (after `storeId`):

```ts
    storeId: z.string().optional(),
    // SalonX widget origin (no trailing slash). Lets the admin re-point booking /
    // check-in / queue widgets without a rebuild.
    widgetHost: z.string().optional(),
```

- [ ] **Step 4: Run — expect PASS**

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `widgetHost` to the `TenantSite` type**

In `src/config/types.ts`, inside `TenantSite` (after `storeId: string;`):

```ts
  // SalonX widget store code (booking / check-in / queue widgets).
  storeId: string;
  // SalonX widget origin (no trailing slash), e.g. "https://app.onglesmaily.com".
  widgetHost: string;
```

- [ ] **Step 6: Set `widgetHost` in every existing tenant site.ts**

This is now a required field — all tenants must set it or the build fails. In each of
`ongles-maily/site.ts`, `ongles-charlesbourg/site.ts`, `ongles-rivieres/site.ts`, add right
after the `storeId` line:

```ts
  // SalonX widget origin (no trailing slash). Admin can override per deploy.
  widgetHost: "https://app.onglesmaily.com",
```

- [ ] **Step 7: Failing sparse-builder test**

In `src/lib/settings-draft.test.ts` add (adapt to the file's existing import of `buildSparseDoc`):

```ts
test("buildSparseDoc persists widgetHost when set, omits when empty", () => {
  const base = { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };
  const withHost = buildSparseDoc({ ...base, site: { widgetHost: "https://x.io" } });
  expect(withHost.site?.widgetHost).toBe("https://x.io");

  const without = buildSparseDoc({ ...base, site: { widgetHost: "" } });
  expect(without.site?.widgetHost).toBeUndefined();
});
```

> If `settings-draft.test.ts` already imports `emptySeoDraft`/`buildSparseDoc`, reuse those imports; otherwise add `import { buildSparseDoc, emptySeoDraft } from "./settings-draft";`. The `customCode: []` field on `base` requires Task 6's type change — run this test green after Task 6 (or keep `customCode: []` here and implement Task 6 immediately after).

- [ ] **Step 8: Run — expect FAIL**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: FAIL (`widgetHost` undefined on result).

- [ ] **Step 9: Persist `widgetHost` in `buildSparseDoc`**

In `src/lib/settings-draft.ts`, inside `buildSparseDoc` site block (after `if (rawSite.storeId) site.storeId = rawSite.storeId;`):

```ts
  if (rawSite.storeId) site.storeId = rawSite.storeId;
  if (rawSite.widgetHost) site.widgetHost = rawSite.widgetHost;
```

- [ ] **Step 10: Run — expect PASS**

Run: `bun test src/lib/store-settings-schema.test.ts src/lib/settings-draft.test.ts`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/config/types.ts src/config/tenants/*/site.ts src/lib/store-settings-schema.ts src/lib/settings-draft.ts src/lib/store-settings-schema.test.ts src/lib/settings-draft.test.ts
git commit -m "feat: configurable SalonX widget host on site config"
```

---

## Task 2: Wire `widgetHost` through widgets + pages

**Files:**
- Modify: `src/components/BookingWidget.tsx`, `src/components/CheckinWidget.tsx`, `src/components/QueueWidget.tsx`
- Modify: `src/app/[lang]/book-online/page.tsx`, `src/app/checkin/page.tsx`, `src/app/queue/page.tsx`

No unit test (client widgets mount external scripts; covered by build + Task 11 E2E + manual verification).

- [ ] **Step 1: `BookingWidget` takes `widgetHost`**

In `src/components/BookingWidget.tsx`, delete the `WIDGET_SRC` const and change the signature/body:

```tsx
export function BookingWidget({
  locale,
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  locale: Locale;
  storeId?: string;
  widgetHost?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (container.querySelector("script[data-store]")) return;

    const script = document.createElement("script");
    script.src = `${widgetHost}/widgets/booking-widget.js`;
    script.async = true;
    script.setAttribute("data-store", storeId);
    script.setAttribute("data-lang", locale);
    container.appendChild(script);
  }, [locale, storeId, widgetHost]);

  return <div ref={ref} className="mt-10 min-h-[420px]" />;
}
```

- [ ] **Step 2: `CheckinWidget` / `QueueWidget` take `widgetHost`**

`src/components/CheckinWidget.tsx`:

```tsx
"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

export function CheckinWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/checkin-widget.js`}
      store={storeId}
      fallbackLabel="check-in"
    />
  );
}
```

`src/components/QueueWidget.tsx`:

```tsx
"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

export function QueueWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/technician-queue-widget.js`}
      store={storeId}
      fallbackLabel="queue"
    />
  );
}
```

- [ ] **Step 3: Pages pass `widgetHost`**

`src/app/[lang]/book-online/page.tsx` (~line 70):

```tsx
        <BookingWidget locale={lang} storeId={site.storeId} widgetHost={site.widgetHost} />
```

`src/app/checkin/page.tsx`:

```tsx
  return <CheckinWidget storeId={site.storeId} widgetHost={site.widgetHost} />;
```

`src/app/queue/page.tsx`:

```tsx
  return <QueueWidget storeId={site.storeId} widgetHost={site.widgetHost} />;
```

- [ ] **Step 4: Type-check / lint**

Run: `bun run lint && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/BookingWidget.tsx src/components/CheckinWidget.tsx src/components/QueueWidget.tsx src/app/[lang]/book-online/page.tsx src/app/checkin/page.tsx src/app/queue/page.tsx
git commit -m "feat: widgets read SalonX host from store config"
```

---

## Task 3: `customCode` schema + type

**Files:**
- Modify: `src/lib/store-settings-schema.ts`
- Test: `src/lib/store-settings-schema.test.ts`

- [ ] **Step 1: Failing tests**

In `src/lib/store-settings-schema.test.ts` add:

```ts
test("customCode array of valid snippets parses", () => {
  const r = StoreSettingsSchema.safeParse({
    customCode: [
      { id: "a", label: "GA4", code: "<script></script>", placement: "head", pages: ["*"], enabled: true },
      { id: "b", label: "Chat", code: "x", placement: "body-end", pages: ["home", "contact"], enabled: false },
    ],
  });
  expect(r.success).toBe(true);
});

test("customCode rejects unknown placement and extra keys", () => {
  expect(
    StoreSettingsSchema.safeParse({
      customCode: [{ id: "a", label: "x", code: "y", placement: "footer", pages: [], enabled: true }],
    }).success,
  ).toBe(false);
  expect(
    StoreSettingsSchema.safeParse({
      customCode: [{ id: "a", label: "x", code: "y", placement: "head", pages: [], enabled: true, evil: 1 }],
    }).success,
  ).toBe(false);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: FAIL (`Unrecognized key "customCode"`).

- [ ] **Step 3: Add schema + type**

In `src/lib/store-settings-schema.ts`, before the `// ── outer schema ──` block:

```ts
// ── custom code section ──────────────────────────────────────────────────────
// Admin-authored third-party snippets (analytics, pixels, chat, embeds). Unlike
// the other sections this is NOT a sparse override of static defaults — the array
// IS the source of truth (deepMerge arrays replace wholesale). Injected client-side
// by CustomCodeHost. `pages` holds canonical route keys or ["*"] for all pages.

const CustomCodeSnippetSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    code: z.string(),
    placement: z.enum(["head", "body-end"]),
    pages: z.array(z.string()),
    enabled: z.boolean(),
  })
  .strict();

export type CustomCodeSnippet = z.infer<typeof CustomCodeSnippetSchema>;
```

Then add to the outer `StoreSettingsSchema` object (after `seo: SeoOverrideSchema.optional(),`):

```ts
    seo: SeoOverrideSchema.optional(),
    customCode: z.array(CustomCodeSnippetSchema).optional(),
```

- [ ] **Step 4: Run — expect PASS**

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store-settings-schema.ts src/lib/store-settings-schema.test.ts
git commit -m "feat: customCode section in store settings schema"
```

---

## Task 4: `route-key` util

**Files:**
- Create: `src/lib/route-key.ts`
- Test: `src/lib/route-key.test.ts`

- [ ] **Step 1: Failing test**

Create `src/lib/route-key.test.ts`:

```ts
import { test, expect } from "bun:test";
import { routeKeyFromPathname, snippetMatchesKey } from "./route-key";

test("routeKeyFromPathname strips locale and returns first segment", () => {
  expect(routeKeyFromPathname("/en/services")).toBe("services");
  expect(routeKeyFromPathname("/fr/book-online")).toBe("book-online");
  expect(routeKeyFromPathname("/en/services/gel")).toBe("services");
});

test("routeKeyFromPathname maps locale root to home", () => {
  expect(routeKeyFromPathname("/fr")).toBe("home");
  expect(routeKeyFromPathname("/en")).toBe("home");
  expect(routeKeyFromPathname("/")).toBe("home");
});

test("snippetMatchesKey honours wildcard and explicit keys", () => {
  expect(snippetMatchesKey(["*"], "about")).toBe(true);
  expect(snippetMatchesKey(["home", "contact"], "contact")).toBe(true);
  expect(snippetMatchesKey(["home"], "services")).toBe(false);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bun test src/lib/route-key.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/lib/route-key.ts`:

```ts
import { isLocale } from "@/lib/i18n";

// Canonical route keys used for per-page custom-code targeting. "*" matches all
// pages. Single source of truth so the admin editor and the injector agree.
export const ROUTE_KEYS = [
  "home",
  "about",
  "services",
  "gallery",
  "locations",
  "reviews",
  "faq",
  "contact",
  "book-online",
  "appointments",
  "privacy",
  "terms",
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

// Map a Next.js pathname (locale-prefixed, e.g. "/en/services/gel") to a route
// key. The locale segment is dropped; the first remaining segment is the key;
// an empty path ("/en" or "/") collapses to "home". Service detail pages
// (/[lang]/services/[slug]) collapse to "services".
export function routeKeyFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) segments.shift();
  return segments[0] ?? "home";
}

// True when a snippet targeting `pages` should render on the page `key`.
export function snippetMatchesKey(pages: string[], key: string): boolean {
  return pages.includes("*") || pages.includes(key);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `bun test src/lib/route-key.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/route-key.ts src/lib/route-key.test.ts
git commit -m "feat: route-key util for per-page custom code targeting"
```

---

## Task 5: Resolver exposes `customCode`

**Files:**
- Modify: `src/lib/store-config.ts`
- Test: `src/lib/store-config.test.ts`

- [ ] **Step 1: Failing test**

In `src/lib/store-config.test.ts`, mirror the existing resolver-test style. If the file
tests `resolveStoreConfig`/`getStoreConfig` against a mocked `readStoreSettings`, add:

```ts
test("resolver returns customCode from override, [] by default", async () => {
  // No override → empty array. (Use the file's existing mock for readStoreSettings → null.)
  const def = await getStoreConfig();
  expect(def.customCode).toEqual([]);
});
```

> Match the existing test's mocking approach (the file already exercises null vs override
> branches). If it only unit-tests `mergeServicesById`, instead assert the shape:
> `expect(Array.isArray((await getStoreConfig()).customCode)).toBe(true)`.

- [ ] **Step 2: Run — expect FAIL**

Run: `bun test src/lib/store-config.test.ts`
Expected: FAIL (`customCode` missing).

- [ ] **Step 3: Add `customCode` to resolver**

In `src/lib/store-config.ts`, add a top-of-file type import and extend `resolveStoreConfig`:

```ts
import type { StoreSettings } from "@/lib/store-settings-schema";
```

```ts
async function resolveStoreConfig(): Promise<{
  site: TenantSite;
  locations: Location[];
  services: readonly Service[];
  customCode: NonNullable<StoreSettings["customCode"]>;
}> {
  const override = await readStoreSettings();

  if (!override) {
    return {
      site: staticSite,
      locations: staticLocations,
      services: staticServices,
      customCode: [],
    };
  }

  const mergedSite = deepMerge(staticSite as Record<string, unknown>, override.site ?? {}) as TenantSite;
  const primaryLocation = staticLocations[0];
  const mergedLocation = deepMerge(
    primaryLocation as Record<string, unknown>,
    override.location ?? {},
  ) as Location;
  const mergedServices = mergeServicesById(staticServices, override.services ?? []);

  return {
    site: mergedSite,
    locations: [mergedLocation],
    services: mergedServices,
    customCode: override.customCode ?? [],
  };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `bun test src/lib/store-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store-config.ts src/lib/store-config.test.ts
git commit -m "feat: getStoreConfig exposes customCode"
```

---

## Task 6: Draft state + sparse build for `customCode`

**Files:**
- Modify: `src/lib/settings-draft.ts`
- Test: `src/lib/settings-draft.test.ts`

- [ ] **Step 1: Failing test**

In `src/lib/settings-draft.test.ts` add:

```ts
test("buildSparseDoc keeps non-empty customCode, drops empty-code rows, omits when none", () => {
  const base = { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };

  expect(buildSparseDoc(base).customCode).toBeUndefined();

  const withRows = buildSparseDoc({
    ...base,
    customCode: [
      { id: "a", label: "GA4", code: "<script></script>", placement: "head", pages: ["*"], enabled: true },
      { id: "b", label: "blank", code: "   ", placement: "head", pages: ["*"], enabled: true },
    ],
  });
  expect(withRows.customCode?.map((s) => s.id)).toEqual(["a"]);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: FAIL (`customCode` not on `SettingsDraftState` / not built).

- [ ] **Step 3: Extend `SettingsDraftState` + `buildSparseDoc`**

In `src/lib/settings-draft.ts`:

Import the types at top:

```ts
import type { StoreSettings, CustomCodeSnippet } from "@/lib/store-settings-schema";
```

Add to `SettingsDraftState`:

```ts
export interface SettingsDraftState {
  site: NonNullable<StoreSettings["site"]>;
  services: NonNullable<StoreSettings["services"]>;
  seoFr: SeoDraft;
  seoEn: SeoDraft;
  customCode: CustomCodeSnippet[];
}
```

In `buildSparseDoc`, before `return doc;`:

```ts
  // ── customCode ────────────────────────────────────────────────────────────
  // The array is the source of truth (not a sparse override). Drop rows with no
  // code; omit the section entirely when nothing remains.
  const validCode = draft.customCode.filter((s) => s.code.trim() !== "");
  if (validCode.length > 0) doc.customCode = validCode;

  return doc;
```

- [ ] **Step 4: Run — expect PASS** (Task 1 Step 7 widgetHost test also passes now)

Run: `bun test src/lib/settings-draft.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings-draft.ts src/lib/settings-draft.test.ts
git commit -m "feat: customCode in settings draft + sparse build"
```

---

## Task 7: `CustomCodeHost` injector + layout wiring

**Files:**
- Create: `src/components/CustomCodeHost.tsx`
- Modify: `src/app/[lang]/layout.tsx`

Behaviour covered by Task 11 E2E (DOM execution can't be unit-tested without a browser); the
pure matching logic is already unit-tested in Task 4.

- [ ] **Step 1: Create `CustomCodeHost`**

Create `src/components/CustomCodeHost.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routeKeyFromPathname, snippetMatchesKey } from "@/lib/route-key";
import type { CustomCodeSnippet } from "@/lib/store-settings-schema";

// Injects admin-authored custom code (analytics, pixels, chat, embeds) into the
// live page. Matched against the current route key, then injected into <head>
// (placement "head") or an end-of-<body> container ("body-end").
//
// We use Range.createContextualFragment — NOT innerHTML / dangerouslySetInnerHTML
// — because browsers do NOT execute <script> tags parsed from innerHTML;
// createContextualFragment produces executable script nodes. Each injected
// top-level element is tagged data-cc-id so the dedupe guard skips re-injection
// on React Strict Mode double-effect and client re-renders (prevents e.g. double
// analytics firing).
//
// Scope: rendered only inside the [lang] layout, so /admin and the /checkin and
// /queue kiosk pages never receive this code. Caveat: legacy document.write()
// snippets won't run post-load.
export function CustomCodeHost({ snippets }: { snippets: CustomCodeSnippet[] }) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);
  const key = routeKeyFromPathname(pathname);

  useEffect(() => {
    const active = snippets.filter(
      (s) => s.enabled && s.code.trim() !== "" && snippetMatchesKey(s.pages, key),
    );

    for (const snippet of active) {
      const target =
        snippet.placement === "head" ? document.head : bodyRef.current;
      if (!target) continue;
      if (target.querySelector(`[data-cc-id="${snippet.id}"]`)) continue;

      const range = document.createRange();
      range.selectNode(target);
      const fragment = range.createContextualFragment(snippet.code);
      for (const node of Array.from(fragment.childNodes)) {
        if (node instanceof Element) node.setAttribute("data-cc-id", snippet.id);
      }
      target.appendChild(fragment);
    }
  }, [snippets, key]);

  return <div ref={bodyRef} data-custom-code-body />;
}
```

- [ ] **Step 2: Render it in the `[lang]` layout**

In `src/app/[lang]/layout.tsx`:

Add the import near the other component imports:

```tsx
import { CustomCodeHost } from "@/components/CustomCodeHost";
```

Destructure `customCode` (currently `const { site, locations } = await getStoreConfig();`):

```tsx
  const { site, locations, customCode } = await getStoreConfig();
```

Render after `<PopupHost locale={lang} />`, still inside `<body>`:

```tsx
        <PopupHost locale={lang} />
        <CustomCodeHost snippets={customCode.filter((s) => s.enabled)} />
```

- [ ] **Step 3: Type-check / lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CustomCodeHost.tsx src/app/[lang]/layout.tsx
git commit -m "feat: CustomCodeHost injects per-page admin code"
```

---

## Task 8: Admin UI — Widget host field + Custom code section

**Files:**
- Modify: `src/components/admin/settings/BrandSeoSection.tsx`
- Create: `src/components/admin/settings/CustomCodeSection.tsx`
- Modify: `src/components/admin/SettingsForm.tsx`

UI wiring; verified by Task 11 E2E + manual.

- [ ] **Step 1: Widget host field in `BrandSeoSection`**

In `src/components/admin/settings/BrandSeoSection.tsx`, add a label inside the grid after the
Store ID field:

```tsx
        <label className={labelClass}>
          <span className={spanClass}>Widget host</span>
          <input
            className={inputClass}
            value={site.widgetHost ?? ""}
            placeholder="https://app.onglesmaily.com"
            onChange={(e) => onSiteChange({ widgetHost: e.target.value || undefined })}
          />
        </label>
```

- [ ] **Step 2: Create `CustomCodeSection`**

Create `src/components/admin/settings/CustomCodeSection.tsx`:

```tsx
"use client";

import type { CustomCodeSnippet } from "@/lib/store-settings-schema";
import { ROUTE_KEYS } from "@/lib/route-key";
import { inputClass, labelClass, spanClass } from "./BrandSeoSection";

// Editor for admin-authored custom code snippets. Each snippet has a label, a raw
// HTML/JS body, a placement (head vs end-of-body), a page target set, and an
// enabled flag. Pages: the "All pages" checkbox stores ["*"]; otherwise the
// selected route keys. The injected code runs directly in the page — see the
// warning below; the single store owner is the trusted author.

interface Props {
  snippets: CustomCodeSnippet[];
  onChange: (next: CustomCodeSnippet[]) => void;
}

function newSnippet(): CustomCodeSnippet {
  return {
    id: crypto.randomUUID(),
    label: "",
    code: "",
    placement: "body-end",
    pages: ["*"],
    enabled: true,
  };
}

export function CustomCodeSection({ snippets, onChange }: Props) {
  function patch(id: string, p: Partial<CustomCodeSnippet>) {
    onChange(snippets.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }
  function remove(id: string) {
    onChange(snippets.filter((s) => s.id !== id));
  }
  function togglePage(s: CustomCodeSnippet, key: string, on: boolean) {
    // Selecting a specific page clears the wildcard; clearing all leaves [].
    const without = s.pages.filter((p) => p !== "*" && p !== key);
    patch(s.id, { pages: on ? [...without, key] : without });
  }
  function setAllPages(s: CustomCodeSnippet, on: boolean) {
    patch(s.id, { pages: on ? ["*"] : [] });
  }

  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        Custom code
      </legend>
      <p className="mt-2 text-xs text-tan">
        Pasted code runs directly in the page (analytics, pixels, chat, embeds).
        Only add code from sources you trust — it has full access to the page.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {snippets.map((s) => {
          const all = s.pages.includes("*");
          return (
            <div key={s.id} className="rounded-lg border border-tan bg-beige p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  <span className={spanClass}>Label</span>
                  <input
                    className={inputClass}
                    value={s.label}
                    placeholder="e.g. GA4, Crisp chat"
                    onChange={(e) => patch(s.id, { label: e.target.value })}
                  />
                </label>
                <label className={labelClass}>
                  <span className={spanClass}>Placement</span>
                  <select
                    className={inputClass}
                    value={s.placement}
                    onChange={(e) =>
                      patch(s.id, { placement: e.target.value as CustomCodeSnippet["placement"] })
                    }
                  >
                    <option value="head">Head</option>
                    <option value="body-end">End of body</option>
                  </select>
                </label>
              </div>

              <fieldset className="mt-3">
                <span className={spanClass}>Pages</span>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={(e) => setAllPages(s, e.target.checked)}
                    />
                    All pages
                  </label>
                  {!all &&
                    ROUTE_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={s.pages.includes(key)}
                          onChange={(e) => togglePage(s, key, e.target.checked)}
                        />
                        {key}
                      </label>
                    ))}
                </div>
              </fieldset>

              <label className={`${labelClass} mt-3`}>
                <span className={spanClass}>Code</span>
                <textarea
                  className={`${inputClass} font-mono`}
                  rows={5}
                  value={s.code}
                  onChange={(e) => patch(s.id, { code: e.target.value })}
                />
              </label>

              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => patch(s.id, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="rounded-pill border border-tan px-3 py-1 text-xs text-mocha"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onChange([...snippets, newSnippet()])}
          className="self-start rounded-pill border border-tan px-4 py-2 text-sm"
        >
          + Add snippet
        </button>
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 3: Wire into `SettingsForm`**

In `src/components/admin/SettingsForm.tsx`:

Add the import:

```tsx
import { CustomCodeSection } from "./settings/CustomCodeSection";
```

Add `customCode` to `emptyState`:

```tsx
function emptyState(): SettingsDraftState {
  return { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };
}
```

Add to `stateFromSettings`:

```tsx
  return {
    site: s.site ?? {},
    services: s.services ?? [],
    seoFr: extractSeo(s.seo?.fr as Record<string, unknown> | undefined),
    seoEn: extractSeo(s.seo?.en as Record<string, unknown> | undefined),
    customCode: s.customCode ?? [],
  };
```

Add a setter near the other setters:

```tsx
  function setCustomCode(next: SettingsDraftState["customCode"]) {
    setDraft((prev) => ({ ...prev, customCode: next }));
    setSaved(false);
  }
```

Render in the form (after `<BookingServicesSection ... />`):

```tsx
          <CustomCodeSection snippets={draft.customCode} onChange={setCustomCode} />
```

- [ ] **Step 4: Type-check / lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/settings/BrandSeoSection.tsx src/components/admin/settings/CustomCodeSection.tsx src/components/admin/SettingsForm.tsx
git commit -m "feat: admin Custom code section + widget host field"
```

---

## Task 9: Neutral `template` tenant

**Files:**
- Create: `src/config/tenants/template/{site.ts,location.ts,services.ts,index.ts,content.en.json,content.fr.json,seo.en.json,seo.fr.json}`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Clone the tenant directory**

```bash
cp -r src/config/tenants/ongles-maily src/config/tenants/template
```

- [ ] **Step 2: Neutralise `site.ts`**

Replace brand/NAP values with generic placeholders, keep `nav`/`routes` structure and the
`as const`. Key fields:

```ts
export const site = {
  name: "Your Salon",
  url: "https://example.com",
  storeId: "XX",
  widgetHost: "https://app.onglesmaily.com",
  booking: "/book-online",
  booker: { brand: "https://example.com/reservation/", giftCertificate: "https://example.com/gift/" },
  socialProfiles: [],
  priceRange: "$$",
  reviews: { ratingValue: 0, reviewCount: 0, bestRating: 5, source: "Google" },
  geo: { lat: 0, lng: 0 },
  hours: [
    { days: ["Mo", "Tu", "We", "Th", "Fr"], opens: "09:00", closes: "18:00" },
    { days: ["Sa"], opens: "10:00", closes: "17:00" },
    { days: ["Su"], opens: "00:00", closes: "00:00" },
  ],
  contact: {
    email: "hello@example.com",
    phone: "(000) 000-0000",
    phoneHref: "tel:+10000000000",
    landmark: "",
    address: {
      line1: "123 Example Street", line2: "City, Region A1A 1A1",
      street: "123 Example Street", city: "City", region: "QC",
      postalCode: "A1A 1A1", country: "CA",
    },
  },
  nav: [
    { key: "services", href: "#services" },
    { key: "gallery", href: "#gallery" },
    { key: "reviews", href: "#testimonials" },
    { key: "locations", href: "#location" },
    { key: "giftcards", href: "#giftcards" },
  ],
  routes: ["/services","/gallery","/locations","/about","/reviews","/faq","/contact","/book-online","/privacy","/terms"],
} as const;
```

- [ ] **Step 3: Neutralise `location.ts`**

Mirror the `ongles-maily/location.ts` shape with placeholder name/address/phone/geo and the
same `bookerSlug`/`hours`/`hoursSpec` structure (keep keys; swap values to generic — e.g.
`name: "Your Salon"`, geo `{ lat: 0, lng: 0 }`).

- [ ] **Step 4: `services.ts`** — leave the 4 service ids/slugs as-is (structural); keep the
  existing prices or set round placeholders. No structural change.

- [ ] **Step 5: Neutralise content + seo JSON**

`content.en.json` / `content.fr.json` and `seo.en.json` / `seo.fr.json`: **keep every key**
(locale + structural parity is mandatory — `type Dictionary = typeof en`). Replace brand-specific
prose/titles with generic copy ("Your Salon", placeholder taglines). Do NOT add or remove keys;
en and fr must stay structurally identical to each other and to the maily originals.

- [ ] **Step 6: Set tenant `id` in `index.ts`**

`src/config/tenants/template/index.ts`:

```ts
// template tenant — neutral placeholder, the clone source for new salon sites.
import { site } from "./site";
import { location } from "./location";
import { services } from "./services";

export const template = {
  id: "template",
  site,
  location,
  services,
} as const;
```

- [ ] **Step 7: Register in the registry**

In `src/config/index.ts`:

```ts
import { onglesMaily } from "./tenants/ongles-maily";
import { onglesCharlesbourg } from "./tenants/ongles-charlesbourg";
import { onglesRivieres } from "./tenants/ongles-rivieres";
import { template } from "./tenants/template";

const registry = {
  "ongles-maily": onglesMaily,
  "ongles-charlesbourg": onglesCharlesbourg,
  "ongles-rivieres": onglesRivieres,
  template,
} as const;
```

- [ ] **Step 8: Build the template tenant**

Run: `TENANT=template bun run build`
Expected: build succeeds (template compiles, locale parity holds).

- [ ] **Step 9: Build the default tenant (regression)**

Run: `bun run build`
Expected: build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/config/tenants/template src/config/index.ts
git commit -m "feat: neutral template tenant as clone source for new sites"
```

---

## Task 10: Cleanup — package name + README

**Files:**
- Modify: `package.json`, `README.md`

- [ ] **Step 1: Rename the package**

In `package.json`: `"name": "purenailbar"` → `"name": "ongles-website"`.

- [ ] **Step 2: Document template + custom code in README**

Add a short section to `README.md`:
- New site onboarding: `cp -r src/config/tenants/template src/config/tenants/<new-id>`, edit
  values, register in `src/config/index.ts`, build with `TENANT=<new-id>`.
- Admin "Custom code" section: paste per-page HTML/JS, choose head vs end-of-body and target
  pages; runs only on public `[lang]` pages (not admin/kiosk). Widget host is configurable in
  the Brand section.

- [ ] **Step 3: Commit**

```bash
git add package.json README.md
git commit -m "chore: rename package to ongles-website + document template and custom code"
```

---

## Task 11: E2E — custom code injection

**Files:**
- Create: `e2e/custom-code.spec.ts`

> Follow the existing `e2e/store-settings.spec.ts` / `e2e/popup-api.spec.ts` patterns for admin
> auth (login via `ADMIN_PASSWORD`) and settings PUT. If E2E needs Supabase + admin env that
> isn't available locally, gate this spec the same way those specs gate (skip when unconfigured).

- [ ] **Step 1: Write the spec**

Create `e2e/custom-code.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

// Verifies admin-authored custom code is injected on targeted public pages only.
// Mirrors the auth/PUT helpers used by e2e/store-settings.spec.ts.
test.describe("custom code injection", () => {
  test("body-end snippet runs on target page, not elsewhere or on kiosk", async ({ page }) => {
    // 1. Authenticate as admin (reuse the project's login helper / ADMIN_PASSWORD).
    // 2. PUT /api/admin/settings with:
    //    { customCode: [{ id:"e2e", label:"e2e", code:"<script>window.__cc_test=1<\/script>",
    //                      placement:"body-end", pages:["home"], enabled:true }] }
    // 3. Target page runs it:
    await page.goto("/en");
    await expect.poll(() => page.evaluate(() => (window as Window & { __cc_test?: number }).__cc_test)).toBe(1);
    // 4. Other page does NOT:
    await page.goto("/en/about");
    expect(await page.evaluate(() => (window as Window & { __cc_test?: number }).__cc_test)).toBeUndefined();
    // 5. Kiosk is out of [lang] scope — no host element:
    await page.goto("/checkin");
    expect(await page.locator("[data-custom-code-body]").count()).toBe(0);
    // 6. Teardown: PUT settings back to {} (remove the snippet).
  });
});
```

> Fill the auth + PUT helper calls from the existing E2E utilities. Use a safe marker
> (`window.__cc_test`) rather than a real third-party script.

- [ ] **Step 2: Run (if E2E env configured)**

Run: `bun run test:e2e -- custom-code`
Expected: PASS, or SKIPPED when admin/Supabase env is absent (matching sibling specs).

- [ ] **Step 3: Commit**

```bash
git add e2e/custom-code.spec.ts
git commit -m "test: e2e for per-page custom code injection"
```

---

## Final verification

- [ ] `bun test src/` — all unit suites green.
- [ ] `bunx tsc --noEmit && bun run lint` — clean.
- [ ] `bun run build` (default) and `TENANT=template bun run build` — both succeed.
- [ ] Manual: `/admin/settings` → add a `head` snippet on All pages + a `body-end` snippet on
  `home`; save; load `/en` and confirm both injected (DevTools: `<head>` has the snippet,
  `window` marker set); change Widget host and confirm `/en/book-online` requests the new origin.

## Spec coverage check
- A1 template tenant → Task 9 · A2 register → Task 9 Step 7 · A3 cleanup → Task 10
- B1 widget host → Tasks 1–2, 8 (admin field) · B2 schema → Task 3 · B3 resolver → Task 5
- B4 injector → Tasks 4 (matching) + 7 · B5 admin UI + draft wiring → Tasks 6, 8
- Verification (unit/build/e2e/manual) → Tasks 1,3,4,5,6,9,11 + Final verification
