# Spec: Template baseline + admin-managed custom code injection

## Context

The repo was renamed to `ongles-website` and is intended to be the **default template**
that gets deployed as many separate branded nail-salon sites, where each deployment is
customized through the admin settings UI — not by editing code.

The repo is **already** a working multi-tenant template:
- Build-time `TENANT` env selects a tenant → static config in `src/config/tenants/<id>/`.
- Supabase `store_settings(tenant_id, doc jsonb)` holds a **sparse override** doc that the
  admin edits live (no rebuild). `getStoreConfig()` (`src/lib/store-config.ts`) deep-merges
  override over static defaults; `revalidateTag` purges the 60s cache on save.
- Admin sections already cover Brand/SEO, Contact/Hours, Booking/Services, SEO.

Two gaps remain against the "default template + admin-driven customization" goal:

1. **No neutral baseline.** The only tenants are 3 real salons (`ongles-maily`,
   `ongles-charlesbourg`, `ongles-rivieres`); default `TENANT` is a real client. There's
   no generic placeholder tenant to clone for a new site. Also `package.json` name is the
   stale `"purenailbar"`.
2. **No admin control over embedded code.** Third-party widget code is hardcoded:
   `BookingWidget`/`CheckinWidget`/`QueueWidget` point at the fixed host
   `https://app.onglesmaily.com/widgets/*.js`; `storeId` is config-driven but the host is
   not. And there is **no general mechanism** for an owner to paste arbitrary per-page code
   (analytics, pixels, chat, booking embeds) — only the sandboxed-iframe `PopupEmbed` for popups.

**Outcome:** a clean neutral `template` tenant as the clone source, configurable SalonX
widget host, and a new admin "Custom code" section that injects owner-pasted HTML/JS into
chosen pages (head or end-of-body), executed directly in the page.

### Decisions locked with the user
- Baseline: **add a neutral `template` tenant** (keep the 3 real salons).
- Injection scope: **both** — general per-page custom code AND make the SalonX widget host an admin field.
- Safety model: **direct injection**, trusting the single admin per deployment (self-XSS risk accepted; required for analytics/pixels/booking to function).

---

## Part A — Neutral `template` tenant + cleanup

### A1. New tenant `src/config/tenants/template/`
Clone the shape of `ongles-maily/` with generic placeholder values:
- `site.ts` — `name: "Your Salon"`, `url: "https://example.com"`, neutral `storeId`,
  placeholder NAP/hours/geo, empty `socialProfiles`, **`widgetHost: "https://app.onglesmaily.com"`** (see B1).
  Keep the same `nav`/`routes` structural keys as ongles-maily (structure is shared template).
- `location.ts`, `services.ts` — same 4 service ids, placeholder prices/address.
- `content.{en,fr}.json`, `seo.{en,fr}.json` — generic copy/meta. **Locale parity is
  mandatory** (AGENTS.md): identical key structure across en/fr.
- `index.ts` — bundle export with `id: "template"`.

### A2. Register tenant
`src/config/index.ts`: import `template` and add `"template": template` to `registry`.
Keep default `TENANT = "ongles-maily"` for deploy continuity (document that new sites build
with `TENANT=template`). Adding `template` to the CI matrix in `.github/workflows/deploy.yml`
is **optional** (skip — template isn't a real domain).

### A3. Cleanup
- `package.json`: `"name": "purenailbar"` → `"ongles-website"`.
- `README.md`: document the `template` tenant as the onboarding clone source and the new
  custom-code admin section.

---

## Part B — Admin-managed code injection

### B1. Configurable SalonX widget host
Replace the three hardcoded `WIDGET_SRC` constants with a host read from config.

- **Type** (`src/config/types.ts`): add `widgetHost: string` to `TenantSite` (URL origin,
  no trailing slash, e.g. `https://app.onglesmaily.com`).
- **Static config**: set `widgetHost` in every tenant `site.ts` (real tenants keep the
  current host; template uses the same default).
- **Override schema** (`src/lib/store-settings-schema.ts`): add `widgetHost: z.string().optional()`
  to `SiteSectionSchema`.
- **Sparse builder** (`src/lib/settings-draft.ts`): persist `widgetHost` if non-empty.
- **Admin UI** (`BrandSeoSection.tsx`): add a "Widget host" text field next to `storeId`.
- **Components**: `BookingWidget`/`CheckinWidget`/`QueueWidget` take a `widgetHost` prop and
  build `` `${widgetHost}/widgets/booking-widget.js` `` etc. Their parent pages
  (`book-online`, `/checkin`, `/queue`) read `getStoreConfig()` and pass
  `site.widgetHost` + `site.storeId` down. Keep the imperative mounting + retry UI unchanged.

### B2. General per-page custom code — data model
Add a new top-level **`customCode`** section to the override doc (admin-authored source of
truth; not a sparse override of static defaults).

`StoreSettingsSchema` — new optional array, each item `.strict()`:
```
customCode: z.array(z.object({
  id: z.string(),                       // stable client-generated id (for dedupe + React keys)
  label: z.string(),                    // admin-facing name, e.g. "GA4", "Crisp chat"
  code: z.string(),                     // raw HTML/JS snippet
  placement: z.enum(["head", "body-end"]),
  pages: z.array(z.string()),           // ["*"] = all pages, else canonical route keys
  enabled: z.boolean(),
}).strict()).optional()
```
Route keys (canonical, locale-stripped): `home`, `about`, `appointments`, `book-online`,
`contact`, `faq`, `gallery`, `locations`, `services`, `reviews`, `privacy`, `terms`, and `*`.
(`/services/[slug]` detail pages match the `services` key.)

### B3. Resolver exposes customCode
`src/lib/store-config.ts`: `resolveStoreConfig()` returns `customCode` =
`override.customCode ?? []` (static default empty). Add `customCode` to the return type so
`getStoreConfig()` callers can read it. Existing `store-config:<id>` revalidate tag already
covers it (settings PUT revalidates it).

### B4. Rendering — executable injection
New **client** host rendered once in `src/app/[lang]/layout.tsx` (after `PopupHost`, inside
`<body>`):
```
<CustomCodeHost snippets={customCode.filter(s => s.enabled)} />
```
`src/components/CustomCodeHost.tsx` (`"use client"`):
- `usePathname()` → strip locale prefix → canonical route key (shared util
  `routeKeyFromPathname` in `src/lib/route-key.ts`).
- For each snippet whose `pages` includes `"*"` or the current key:
  - `useEffect` injects `code` into `document.head` (placement `head`) or a ref'd
    end-of-body container (`body-end`) using
    `document.createRange().createContextualFragment(code)` — **this is what makes pasted
    `<script>` tags execute** (innerHTML/dangerouslySetInnerHTML would NOT run them).
  - Dedupe guard: tag injected nodes with `data-cc-id={snippet.id}`; skip if already present
    (Strict Mode double-effect / re-mounts), mirroring `BookingWidget`'s guard. Avoids
    double-firing analytics.
- Scope: lives only under `[lang]` layout, so admin/kiosk (`/admin`, `/checkin`, `/queue`)
  never receive marketing code. Document this boundary.
- Caveat to document: legacy `document.write` snippets won't work post-load (acceptable).

### B5. Admin UI — Custom code section
`src/components/admin/settings/CustomCodeSection.tsx`:
- Renders a list of snippet rows from draft state; add / remove buttons.
- Per row: `label` input, `placement` select (Head / End of body), `pages` multi-select
  (an "All pages" checkbox + the route-key checkboxes), `enabled` toggle, `code` textarea
  (monospace), plus a short trust/XSS warning line.
- New snippet id generated client-side (e.g. `crypto.randomUUID()`).

Wire-up:
- `src/lib/settings-draft.ts`: add `customCode` to `SettingsDraftState`, hydrate in
  `stateFromSettings`, and in `buildSparseDoc` include the array when non-empty (drop rows
  with empty `code`).
- `src/components/admin/SettingsForm.tsx`: add `customCode` state + `setCustomCode`, render
  `<CustomCodeSection>` in the form.

---

## Critical files

| File | Change |
|------|--------|
| `src/config/tenants/template/*` | **new** neutral tenant (site/location/services/content/seo/index) |
| `src/config/index.ts` | register `template` in registry |
| `src/config/types.ts` | add `widgetHost` to `TenantSite` |
| `src/config/tenants/*/site.ts` | add `widgetHost` value (all tenants) |
| `src/lib/store-settings-schema.ts` | add `site.widgetHost`, top-level `customCode` array |
| `src/lib/store-config.ts` | resolver returns `customCode` |
| `src/lib/settings-draft.ts` | draft state + sparse build for `widgetHost` + `customCode` |
| `src/lib/route-key.ts` | **new** `routeKeyFromPathname()` util |
| `src/components/CustomCodeHost.tsx` | **new** client injector (createContextualFragment) |
| `src/app/[lang]/layout.tsx` | render `<CustomCodeHost>`, pass `customCode` from `getStoreConfig` |
| `src/components/{BookingWidget,CheckinWidget,QueueWidget}.tsx` | take `widgetHost` prop |
| `src/app/[lang]/book-online/page.tsx`, `src/app/checkin/page.tsx`, `src/app/queue/page.tsx` | pass `widgetHost`+`storeId` |
| `src/components/admin/settings/BrandSeoSection.tsx` | add Widget host field |
| `src/components/admin/settings/CustomCodeSection.tsx` | **new** custom-code editor |
| `src/components/admin/SettingsForm.tsx` | wire customCode section |
| `package.json` / `README.md` | rename + docs |

### Reused (do not reinvent)
- Sparse persistence + omit-empty: `buildSparseDoc`/`omitEmpty`/`hasKeys` in `settings-draft.ts`.
- Deep-merge + cache/revalidate plumbing: `store-config.ts`, settings API route.
- Imperative-injection + dedupe guard precedent: `BookingWidget.tsx`, `WidgetEmbed.tsx`.
- Locale helpers: `src/lib/i18n.ts` (`isLocale`, `locales`).

---

## Verification

1. **Unit (bun:test):**
   - `routeKeyFromPathname`: `/en/services` → `services`, `/fr` → `home`, `/en/services/gel` → `services`.
   - `buildSparseDoc`: `customCode` omitted when empty / rows with empty code dropped; `widgetHost` persisted only when set.
   - `StoreSettingsSchema`: valid customCode parses; unknown placement / extra keys rejected (`.strict()`).
   - `store-config` resolver returns `customCode` from override and `[]` default.
2. **Build:** `bun run build` with `TENANT=template` (new tenant compiles, locale parity holds) and default tenant.
3. **E2E (Playwright):** admin login → add a `body-end` snippet on `home` that sets
   `window.__cc_test` / injects a marker element → load `/en` and assert it ran; load
   `/en/about` and assert it did **not**. Verify a `head` snippet lands in `<head>`. Confirm
   `/admin` and `/checkin` never receive the snippet.
4. **Manual:** change widget host in admin → confirm booking widget requests the new origin.

---

## Out of scope
- Per-tenant theming/colors/logos (separate effort).
- Making nav/routes/service-ids admin-editable (structural, build-time).
- Switching default `TENANT` to `template` (kept `ongles-maily` for continuity).
- Sandboxing or host-allowlisting injected code (explicitly rejected; trusted-admin model).
