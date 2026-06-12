<!-- s1 metadata
task-name: tenant-logo-admin-setting
worktree: tenant-logo-admin-setting
speckit: false
scope: small
status: plan-approved
repo: /Users/theduy/Repo/ongles-website
created-at: 2026-06-12
-->

# Per-Tenant Admin-Editable Header Logo — Implementation Plan

> **For agentic workers:** single-context TDD (scope: small). Each Truth → a FAILING test first
> (RED → verify wrong-reason fail → minimal GREEN → commit). Iron Law: no production code without
> a failing test first.

**Goal:** Let each store admin upload a header logo from /admin settings that goes live per-tenant
without a rebuild.

**Architecture:** Add one optional `logo` string to the existing `site` config namespace. Reuses
the proven upload endpoint (`/api/admin/upload`), the sparse-override schema, and the 3-layer merge
(`getStoreConfig`). Per-tenant isolation is inherent — each tenant persists its own override row.

**Tech Stack:** Next.js (App Router), Zod, Supabase Storage, `bun test`, Playwright.

---

## Must-Haves (goal-backward verification anchors)

- **Truths:**
  1. `SiteSectionSchema` accepts `{ logo: "https://…" }` and rejects unknown sibling keys (`.strict`).
  2. `buildSparseDoc` includes `site.logo` when set, omits it when empty/undefined.
  3. The public header renders an `<img>` for the logo; falls back to `/images/logo.png` when no
     custom `site.logo` is set.
  4. Admin Brand section: picking a file uploads it (`/api/admin/upload`) and stores the returned
     URL in `draft.site.logo`; Remove clears it.
- **Artifacts:** `logo` field present in `TenantSite` (`src/config/types.ts`) and `SiteSectionSchema`
  (`src/lib/store-settings-schema.ts`); upload control in `BrandSeoSection.tsx`; logo render branch
  in `Header.tsx`.
- **Key links:** `BrandSeoSection` `onSiteChange({ logo })` → `buildSparseDoc` → PUT
  `/api/admin/settings` → `resolveStoreConfig` deepMerge → `layout.tsx` `<Header site={site}>` →
  `Logo src={site.logo}`.

## File Structure

- Modify `src/config/types.ts` — add `logo?: string` to `TenantSite`.
- Modify `src/lib/store-settings-schema.ts` — add `logo` to `SiteSectionSchema`.
- Modify `src/lib/settings-draft.ts` — sparse-persist `site.logo` in `buildSparseDoc`.
- Modify `src/components/Header.tsx` — `Logo` renders custom `<img>` vs static `next/image` default.
- Modify `src/components/admin/settings/BrandSeoSection.tsx` — file-upload control + preview + remove.
- Modify `src/lib/store-settings-schema.test.ts`, `src/lib/settings-draft.test.ts` — unit tests.
- Modify `e2e/store-settings.spec.ts` — public-header assertion (CI-safe) + env-gated round-trip.

---

## Implementation Plan

### Task 1: Schema — accept `site.logo`

**Files:**
- Modify: `src/lib/store-settings-schema.ts` (in `SiteSectionSchema`, near `widgetHost`)
- Test: `src/lib/store-settings-schema.test.ts`

- [ ] **Step 1: Write the failing test** (append after the `widgetHost` test, ~line 127)

```typescript
test("site.logo is accepted", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { logo: "https://cdn.example.com/logo.png" },
  });
  bexpect(r.success).toBe(true);
});

test("site rejects an unknown sibling key next to logo", () => {
  const r = StoreSettingsSchema.safeParse({
    site: { logo: "https://x/y.png", logoo: "typo" },
  });
  bexpect(r.success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: FAIL — `site.logo` rejected by `.strict()` (unknown key) so first test fails.

- [ ] **Step 3: Add the field**

In `SiteSectionSchema` (after the `widgetHost` line ~82):

```typescript
    // Header logo image URL (Supabase public bucket). Falls back to the static
    // /images/logo.png default when unset. Admin-uploaded via /api/admin/upload.
    logo: z.string().optional(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/store-settings-schema.test.ts`
Expected: PASS (both new tests; unknown-key test still fails parse as intended).

- [ ] **Step 5: Commit**

```bash
git add src/lib/store-settings-schema.ts src/lib/store-settings-schema.test.ts
git commit -m "feat: accept site.logo in store settings schema"
```

---

### Task 2: `buildSparseDoc` — sparse-persist `site.logo`

**Files:**
- Modify: `src/lib/settings-draft.ts:67` (the site field block in `buildSparseDoc`)
- Test: `src/lib/settings-draft.test.ts`

- [ ] **Step 1: Write the failing test** (append after the widgetHost test, ~line 177)

```typescript
test("buildSparseDoc persists logo when set, omits when empty", () => {
  const base = { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft(), customCode: [] };
  const withLogo = buildSparseDoc({ ...base, site: { logo: "https://cdn/x.png" } });
  expect(withLogo.site?.logo).toBe("https://cdn/x.png");

  const without = buildSparseDoc({ ...base, site: { logo: "" } });
  expect(without.site?.logo).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: FAIL — `withLogo.site?.logo` is `undefined` (field not yet copied).

- [ ] **Step 3: Copy the field** (after the `widgetHost` line ~67)

```typescript
  if (rawSite.logo) site.logo = rawSite.logo;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings-draft.ts src/lib/settings-draft.test.ts
git commit -m "feat: sparse-persist site.logo in buildSparseDoc"
```

---

### Task 3: `TenantSite` type — carry `logo`

**Files:**
- Modify: `src/config/types.ts` (in `TenantSite`, near `name`/`url`/`booking`)

- [ ] **Step 1: Add the field**

In `TenantSite` (after `url: string;` ~line 57):

```typescript
  // Optional header logo image URL. Merged from the Supabase override; when
  // absent the header uses the static /images/logo.png default.
  logo?: string;
```

- [ ] **Step 2: Verify typecheck is clean**

Run: `bunx tsc --noEmit`
Expected: PASS — no errors. (`resolveStoreConfig` already deepMerges `override.site`; the merged
`site.logo` now type-flows to `Header` without resolver changes.)

- [ ] **Step 3: Commit**

```bash
git add src/config/types.ts
git commit -m "feat: add optional logo to TenantSite type"
```

---

### Task 4: `Header` — render custom logo with static fallback

**Files:**
- Modify: `src/components/Header.tsx:13-25` (the `Logo` component) and the call site `:51`

- [ ] **Step 1: Replace the `Logo` component**

```typescript
// Brand logo. Custom uploaded logos (Supabase URL, arbitrary aspect ratio) render
// as a height-constrained <img> — no next.config remote-domain allowlist needed and
// any ratio scales. The static default keeps next/image optimization.
function Logo({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied remote URL, height-constrained
      <img src={src} alt={name} className="h-10 w-auto sm:h-12" />
    );
  }
  return (
    <Image
      src="/images/logo.png"
      alt={name}
      width={829}
      height={302}
      priority
      className="h-10 w-auto sm:h-12"
    />
  );
}
```

- [ ] **Step 2: Pass the override at the call site** (~line 51)

```typescript
          <Logo name={site.name} src={site.logo} />
```

- [ ] **Step 3: Verify typecheck + lint clean**

Run: `bunx tsc --noEmit && bun run lint`
Expected: PASS (`site.logo` is typed from Task 3; eslint-disable covers the `<img>`).

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: header renders admin logo with static fallback"
```

---

### Task 5: `BrandSeoSection` — logo upload control

**Files:**
- Modify: `src/components/admin/settings/BrandSeoSection.tsx`

Pattern reference: `src/components/admin/PopupForm.tsx:75-92,204-232` (`onPickImage` flow).

- [ ] **Step 1: Add upload state + handler** (inside `BrandSeoSection`, before `return`)

```typescript
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.success) onSiteChange({ logo: data.data.url });
      else setUploadError(data.error ?? "Upload failed");
    } catch {
      setUploadError("Upload network error");
    } finally {
      setUploading(false);
    }
  }
```

Add the import at the top:

```typescript
import { useState } from "react";
```

- [ ] **Step 2: Add the control inside the Brand `<fieldset>`** (after the grid `</div>`, before the closing `</fieldset>`)

```typescript
      <div className="mt-3 flex flex-col gap-2 border-t border-fog pt-3">
        <span className={spanClass}>Logo</span>
        <input type="file" accept="image/*" onChange={onPickLogo} className="text-xs" />
        {uploading && <p className="text-xs text-tan">Uploading…</p>}
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {site.logo && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview only */}
            <img src={site.logo} alt="" className="h-10 w-auto rounded bg-white p-1" />
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => onSiteChange({ logo: undefined })}
            >
              Remove
            </button>
          </div>
        )}
      </div>
```

- [ ] **Step 3: Verify typecheck + lint clean**

Run: `bunx tsc --noEmit && bun run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/settings/BrandSeoSection.tsx
git commit -m "feat: admin Brand logo upload control"
```

---

### Task 6: E2E — public header logo + env-gated custom-logo round-trip

**Files:**
- Modify: `e2e/store-settings.spec.ts`

- [ ] **Step 1: Add a CI-safe public-header assertion** (new `test.describe` block at end of file)

```typescript
test.describe("public header logo", () => {
  test("renders a logo image in the header by default", async ({ page }) => {
    await page.goto("/en");
    // The header link wraps the brand logo image; default is the static wordmark.
    const logo = page.locator("header a img").first();
    await expect(logo).toBeVisible();
  });
});
```

- [ ] **Step 2: Add the env-gated custom-logo round-trip** (inside the existing
  `live store-settings edit` describe, mirroring the price test ~line 44)

```typescript
  test("setting a custom logo shows it in the public header without a rebuild", async ({
    page,
    request,
  }) => {
    const login = await request.post("/api/admin/login", {
      data: { password: process.env.ADMIN_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();

    const LOGO = "https://example.com/custom-logo.png";
    const put = await request.put("/api/admin/settings", {
      data: { site: { logo: LOGO } },
    });
    expect(put.ok()).toBeTruthy();

    await page.goto("/en");
    await expect(page.locator(`header a img[src="${LOGO}"]`)).toBeVisible();
  });
```

- [ ] **Step 3: Run the CI-safe spec**

Run: `bunx playwright test e2e/store-settings.spec.ts -g "public header logo"`
Expected: PASS (requires dev server / Playwright webServer config; the env-gated test auto-skips
without `ADMIN_PASSWORD` + Supabase creds, same as the existing price test).

- [ ] **Step 4: Commit**

```bash
git add e2e/store-settings.spec.ts
git commit -m "test: e2e public header logo + custom-logo round-trip"
```

---

## Final verification (all tasks done)

1. `bun test src/` — full unit suite green (schema + settings-draft logo tests included).
2. `bunx tsc --noEmit` — clean.
3. `bun run lint` — clean.
4. Manual: `bun run dev` → `/admin` login → Store settings → Brand → upload a logo → Save →
   reload `/en` → header shows new logo; Remove → header falls back to `/images/logo.png`.
