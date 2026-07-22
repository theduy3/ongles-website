# Top Employee Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blank, standalone `/topemployee` TV page that loads the Ongles Maily employee-of-the-month widget.

**Architecture:** Follow the existing standalone kiosk route pattern: bypass locale redirects in the proxy, render a minimal noindex layout, resolve runtime store configuration in the server page, and delegate third-party script injection to the shared `WidgetEmbed` client component. The wrapper passes the widget's required `data-eom-store` attribute so the runtime Ongles Maily configuration produces the requested `data-eom-store="OM"` embed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bun test

## Global Constraints

- The public URL is exactly `/topemployee` with no locale prefix.
- The page is a blank/minimal TV surface with no site header, footer, or popups.
- The widget script URL resolves to exactly `https://app.onglesmaily.com/widgets/eom-widget.js` in the Ongles Maily container.
- The script attribute resolves to exactly `data-eom-store="OM"` in the Ongles Maily container.
- Reuse runtime `site.widgetHost` and `site.storeId` configuration; do not duplicate tenant values in the page.
- Keep the standalone route out of search indexes.
- Preserve all existing standalone routes and locale-routing behavior.

---

### Task 1: Add the standalone top-employee TV route

**Files:**
- Create: `src/components/TopEmployeeWidget.test.tsx`
- Create: `src/components/TopEmployeeWidget.tsx`
- Create: `src/app/topemployee/page.test.tsx`
- Create: `src/app/topemployee/page.tsx`
- Create: `src/app/topemployee/layout.tsx`
- Create: `src/app/topemployee/layout.test.ts`
- Modify: `src/proxy.test.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `WidgetEmbed({ src, store, storeAttr, fallbackLabel })` and `getStoreConfig()` returning `site.storeId`, `site.widgetHost`, and optional `site.favicon`.
- Produces: `TopEmployeeWidget({ storeId?: string, widgetHost?: string })` and the standalone `/topemployee` route.

- [ ] **Step 1: Write failing route and widget contract tests**

Add a `/topemployee` passthrough assertion to the standalone proxy test:

```ts
it("serves /topemployee directly", async () => {
  const res = await proxy(req("/topemployee"));
  expect(locationOf(res)).toBeNull();
});
```

Create `src/components/TopEmployeeWidget.test.tsx` and a page contract test that
asserts the runtime `site.storeId` and `site.widgetHost` are passed to
`TopEmployeeWidget`.

```tsx
import { describe, expect, it } from "bun:test";
import type { ReactElement } from "react";
import { WidgetEmbed } from "@/components/WidgetEmbed";
import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";

describe("TopEmployeeWidget", () => {
  it("binds the EOM script and store attribute", () => {
    const element = TopEmployeeWidget({}) as ReactElement<{
      src: string;
      store: string;
      storeAttr: string;
    }>;

    expect(element.type).toBe(WidgetEmbed);
    expect(element.props.src).toBe(
      "https://app.onglesmaily.com/widgets/eom-widget.js",
    );
    expect(element.props.store).toBe("OM");
    expect(element.props.storeAttr).toBe("data-eom-store");
  });
});
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `bun test src/proxy.test.ts src/components/TopEmployeeWidget.test.tsx`

Expected: FAIL because `/topemployee` redirects to `/fr/topemployee` and `TopEmployeeWidget` does not exist.

- [ ] **Step 3: Implement the widget wrapper and route passthrough**

Create `src/components/TopEmployeeWidget.tsx`:

```tsx
"use client";

import { WidgetEmbed } from "@/components/WidgetEmbed";

export function TopEmployeeWidget({
  storeId = "OM",
  widgetHost = "https://app.onglesmaily.com",
}: {
  storeId?: string;
  widgetHost?: string;
}) {
  return (
    <WidgetEmbed
      src={`${widgetHost}/widgets/eom-widget.js`}
      store={storeId}
      storeAttr="data-eom-store"
      fallbackLabel="top employee display"
    />
  );
}
```

Add `"/topemployee"` to `STANDALONE_PATHS` in `src/proxy.ts`.

- [ ] **Step 4: Implement the page and minimal noindex layout**

Create `src/app/topemployee/page.tsx`:

```tsx
import { TopEmployeeWidget } from "@/components/TopEmployeeWidget";
import { getStoreConfig } from "@/lib/store-config";

export default async function TopEmployeePage() {
  const { site } = await getStoreConfig();
  return (
    <TopEmployeeWidget
      storeId={site.storeId}
      widgetHost={site.widgetHost}
    />
  );
}
```

Create `src/app/topemployee/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "../globals.css";
import { getStoreConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getStoreConfig();
  return {
    title: "Top employee",
    robots: { index: false, follow: false },
    ...(site.favicon ? { icons: { icon: site.favicon } } : {}),
  };
}

export default function TopEmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-fog text-espresso">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Add metadata regression tests**

Create `src/app/topemployee/layout.test.ts` by following the queue layout test pattern. Assert that `generateMetadata()` uses the configured favicon, omits icons without a favicon, returns title `Top employee`, sets `{ index: false, follow: false }`, and exports `dynamic` as `force-dynamic`.

- [ ] **Step 6: Run focused and full verification**

Run: `bun test src/proxy.test.ts src/components/TopEmployeeWidget.test.tsx src/app/topemployee/page.test.tsx src/app/topemployee/layout.test.ts`

Expected: all focused tests PASS with pristine output.

Run: `bun test src/`

Expected: all tests PASS with zero failures.

Run: `bun run lint`

Expected: exit code 0.

Run: `bun run build`

Expected: exit code 0 and `/topemployee` appears in the generated route list.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/plans/2026-07-22-topemployee-widget.md src/proxy.ts src/proxy.test.ts src/components/TopEmployeeWidget.tsx src/components/TopEmployeeWidget.test.tsx src/app/topemployee/page.tsx src/app/topemployee/page.test.tsx src/app/topemployee/layout.tsx src/app/topemployee/layout.test.ts
git commit -m "feat: add top employee TV widget page"
```
