# Spec: Per-Tenant Admin-Editable Header Logo

## Context

The site header logo is currently **hardcoded** in `src/components/Header.tsx` as
`<Image src="/images/logo.png" />` — one baked-in file shared by every tenant. Each branded
deployment (ongles-maily, ongles-charlesbourg, ongles-rivieres) shows the same wordmark, and a
store admin has no way to change it without a code change + rebuild.

This feature lets each store admin upload their own header logo from the existing **/admin
settings** page. It rides the existing 3-layer config system (static tenant config → sparse
Supabase override → merge at read), so "per tenant" is automatic: each tenant already persists
its own override row keyed by `tenant_id`.

**Outcome:** an admin opens Store settings → Brand → uploads a logo image → saves → their site
header shows the new logo after revalidation. No rebuild. Other tenants are unaffected.

## Decisions (locked)

- **Input method:** file **upload**, reusing `POST /api/admin/upload` (the same endpoint that
  already powers popup images via `uploadPopupImage` → Supabase public bucket → public URL).
- **Scope:** **header logo only**. Favicon and OG/social image stay static (out of scope).
- **Rendering:** when a custom `site.logo` URL is present, render a height-constrained plain
  `<img>` (`h-10 w-auto sm:h-12`) so any aspect ratio scales without distortion and without
  needing a `next.config` remote-domain allowlist. When absent, keep the existing `next/image`
  static default (`/images/logo.png`). This mirrors how popup images already render.

## Architecture (reused, not new)

```
Admin Brand section ──upload──> /api/admin/upload ──> Supabase bucket ──> { url }
        │ (url stored in draft.site.logo)
        ▼
   buildSparseDoc ──> PUT /api/admin/settings ──> Supabase override row (site.logo)
        │
        ▼
 getStoreConfig / resolveStoreConfig  (deepMerge override.site over static site)
        │ (merged TenantSite now carries .logo)
        ▼
 layout.tsx  <Header site={site} />  ──>  Logo reads site.logo (fallback /images/logo.png)
```

## Changes

A single new optional `logo` string field threaded through the existing `site` namespace, plus
an upload control in the admin Brand section and a fallback in the header.

1. **`src/config/types.ts`** — add `logo?: string` to `TenantSite` (the merged-config carrier).
2. **`src/lib/store-settings-schema.ts`** — add `logo: z.string().optional()` to
   `SiteSectionSchema` (alongside `name`, `url`, `widgetHost`, …). `.strict()` already guards typos.
3. **`src/lib/settings-draft.ts`** — in `buildSparseDoc`, add `if (rawSite.logo) site.logo = rawSite.logo;`
   so an empty value is omitted and the static default shines through (consistent with widgetHost).
4. **`src/components/admin/settings/BrandSeoSection.tsx`** — add a "Logo" upload control:
   `<input type="file" accept="image/*">` → reuse the `onPickImage`-style flow from `PopupForm`
   (FormData → `POST /api/admin/upload` → on success `onSiteChange({ logo: data.data.url })`),
   with uploading state, error text, a preview `<img>`, and a Remove button
   (`onSiteChange({ logo: undefined })`). Local `useState` for `uploading` / `uploadError`.
5. **`src/components/Header.tsx`** — `Logo` becomes
   `{ name, src }: { name: string; src?: string }`. If `src` → plain height-constrained `<img>`;
   else the existing `next/image` default. `Header` passes `src={site.logo}`.
6. **Tenant static defaults** — none required. Omitting `logo` from tenant `site.ts` files keeps
   the shared `/images/logo.png` default. (Optional: a tenant could later bake its own default,
   but not needed now.)

### Reused, unchanged
- `POST /api/admin/upload` (`src/app/api/admin/upload/route.ts`) — type/size validation already correct.
- `uploadPopupImage` (`src/lib/popups-store.ts`) — public bucket upload + public URL.
- `PopupForm.onPickImage` (`src/components/admin/PopupForm.tsx`) — the client upload pattern to copy.
- `deepMerge` / `getStoreConfig` resolver — `site.logo` merges with zero resolver changes.

## Must-Haves (the contract `/s1-plan` turns into failing tests first)

1. `SiteSectionSchema` accepts `{ logo: "https://…" }` and **rejects** unknown sibling keys (`.strict`).
2. `buildSparseDoc` **includes** `site.logo` when set, **omits** it when empty/undefined (no frozen
   empty value over the static default).
3. `Header`/`Logo` renders the custom `<img src={site.logo}>` when `site.logo` is set, and the
   static `next/image` default when it is not.
4. Admin Brand section: picking a file uploads and stores the returned URL in `draft.site.logo`;
   Remove clears it.
5. Per-tenant isolation holds: a logo saved under one tenant's override does not affect another
   (covered by the existing tenant-scoped settings store; assert no cross-write in the settings test).

## Testing

- **Unit** — extend `src/lib/store-settings-schema.test.ts` (logo accepted; unknown key rejected)
  and `src/lib/settings-draft.test.ts` (logo present/absent sparse behavior).
- **Component** — `Header` renders custom `<img>` vs static default based on `site.logo`.
- **E2E (Playwright)** — admin uploads a logo in Store settings, saves, header reflects it; mirror
  the existing per-page custom-code E2E that already exercises the settings round-trip.

## Verification

1. `bun run test` (or project runner) — all suites green, new tests included.
2. `bun run typecheck` — no errors (new `logo` field flows through types).
3. `bun run dev` → `/admin` login → Store settings → Brand → upload a logo → Save → reload site
   header shows the new logo; clear it → header falls back to `/images/logo.png`.

## Out of Scope

- Favicon / OG / social-share image replacement.
- Logo cropping, resizing, or aspect-ratio editing in-app (admin uploads a pre-sized image).
- Per-locale logos.
