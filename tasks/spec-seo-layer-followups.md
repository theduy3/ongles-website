# Spec: SEO Layer Follow-ups

> Follow-ups to commit `9242623` (*feat: separate SEO layer from UI dictionary*),
> which moved SEO out of the `content` namespace into a dedicated per-tenant `seo`
> layer. Three loose ends remain: legacy DB overrides orphaned by the namespace
> move, incomplete admin coverage of the SEO key set, and an uncaptured lesson.

## Background

The SEO refactor introduced a separate `seo` namespace composed at request time
(`src/app/[lang]/seo-content.ts`): `base → tenant → DB` deep-merge, cached 60 s,
tag `store-seo:<id>`. The DB layer reads `settings.seo.{locale}` only.

Two structural gaps resulted:

1. **Orphaned legacy overrides.** Before the refactor, operator SEO edits were
   saved under the `content` namespace (`settings.content.{locale}.meta`,
   `…serviceDetails.{id}.*`, `…gallery.photos.{id}.alt`). The new resolver never
   reads those, so any such legacy DB row is silently ignored — page meta falls
   back to static JSON with no error.

2. **Partial admin coverage.** `SeoSection.tsx` exposes only 12 page-meta keys.
   The draft model (`settings-draft.ts`) flattens just the `meta` subtree
   (`seo.{loc} = { meta }`), so per-service meta, gallery alt, remaining page
   meta, and org description cannot be edited in the admin — they require hand
   editing the tenant `seo.{locale}.json`.

## Goals

- **A.** Non-destructive read-time shim that folds legacy `content` SEO into the
  `seo` layer, with explicit `seo` edits winning, plus a log signal so the
  legacy data can later be migrated and the shim deleted.
- **B.** Admin SeoSection edits the **complete** SEO key set, with the draft
  model mirroring the nested `seo.json` shape.
- **C.** Capture the lesson (namespace move orphans DB overrides; `typeof en`
  gives no compile-time locale-parity guard).

## Non-Goals (YAGNI)

- No destructive legacy cleanup / DB migration script. Deferred until the shim's
  logs confirm real legacy data exists in a tenant row.
- No `org` legacy mapping (no legacy `content` form for it existed).
- No new SEO fields beyond what `seo.{locale}.json` already defines.
- No schema rewrite — `SeoOverrideSchema` is already permissive enough (confirm).

---

## Part A — Read-time back-compat shim

### Placement

`src/app/[lang]/seo-content.ts`, inside `resolveSeoOverride(locale)`. After
`readStoreSettings()`, fold legacy content SEO under the live `seo` override:

```ts
async function resolveSeoOverride(locale: Locale): Promise<Content> {
  const settings = await readStoreSettings();
  const legacy = liftLegacySeo(settings?.content?.[locale] as Content | undefined, locale);
  const current = (settings?.seo?.[locale] as Content | undefined) ?? {};
  // legacy is the floor; explicit `seo` edits win on leaf collisions.
  return deepMerge(legacy, current);
}
```

Reuse the same deep-merge primitive `compose-seo.ts` uses (extract/share if it is
currently inlined). The shim runs **inside** the cached resolver, so it inherits
the existing 60 s cache + `store-seo:<id>` tag — no extra cache surface.

### `liftLegacySeo` helper

New file `src/app/[lang]/legacy-seo-shim.ts` — pure, no `server-only`, unit
testable. Signature:

```ts
export function liftLegacySeo(
  content: Record<string, unknown> | undefined,
  locale: Locale,
): Record<string, unknown> // { meta?, services?, gallery? } — empty {} when nothing to lift
```

Transforms (legacy `content.{locale}` → `seo.{locale}` shape):

| Legacy path | New path | Transform |
|---|---|---|
| `meta.{pageKey}` | `meta.{pageKey}` | passthrough (identical key set) |
| `serviceDetails.{id}.{metaTitle,metaDescription,heroAlt}` | `services.{id}.{…}` | rename `serviceDetails`→`services`; copy **only** `metaTitle`, `metaDescription`, `heroAlt`; drop UI copy (`hygiene`, `whyUs`, etc.). `schemaDescription` is new and has no legacy source — omitted. |
| `gallery.photos.{id}.alt` | `gallery.{id}.alt` | unwrap the `photos` level |

`org` is intentionally not mapped (no legacy form). Absent / empty subtrees
contribute nothing; a fully empty `content` yields `{}`.

### Log signal

When `liftLegacySeo` produces any keys, emit exactly one warning per resolve:

```ts
console.warn(`[seo-shim] lifted legacy content SEO for ${tenant.id}/${locale}: ${keys.join(", ")}`);
```

Purpose: surface which tenants still carry legacy data so it can be re-entered
via the admin SEO section and the shim later removed. The repo bans
`console.log` in production code; `console.warn` is used deliberately here as an
operational migration signal (revisit when the shim is deleted).

### Properties

- **Non-destructive.** Never writes back; legacy stays in `content` until a
  future manual cleanup.
- **Precedence.** Explicit `seo` edits always win over lifted legacy values.
- **Safe when empty.** No legacy data → `{}` → behaviour identical to today.

---

## Part B — Full SEO coverage in admin

### Draft model (`src/lib/settings-draft.ts`)

Replace the flat `seoFr` / `seoEn: SeoMeta` with the **full nested override**
mirroring `seo.json`:

```ts
interface SeoDraft {
  meta?: Record<string, string>;                  // all page-meta keys
  services?: Record<string, {                      // keyed by service id
    metaTitle?: string; metaDescription?: string;
    schemaDescription?: string; heroAlt?: string;
  }>;
  gallery?: Record<string, { alt?: string }>;      // keyed by image id
  org?: { description?: string };
}
// SettingsDraftState gains: seoFr: SeoDraft; seoEn: SeoDraft;
```

- `extractSeoMeta` → `extractSeo(locale)` returning the nested `SeoDraft`
  (reads `seo.{loc}.{meta,services,gallery,org}`).
- `buildSparseDoc` prunes empties **recursively**: empty string → omit, object
  with no surviving keys → omit, so static defaults still shine through the
  deep-merge. The whole `seo` section is omitted when nothing survives.

### `SeoSection.tsx`

Grouped `<fieldset>` per logical block, rendered for **both** locales:

- **Page meta** — all keys (home, services, about, bookOnline, contact, reviews,
  faq, gallery, locations, terms, privacy → title + description each).
- **Per-service** — 4 services × (metaTitle, metaDescription, schemaDescription,
  heroAlt).
- **Gallery alt** — 6 images × alt.
- **Org** — description.

Key lists derived from a **single shared source of truth** (the base
`seo.en.json` shape — e.g. `Object.keys(base.meta)`, `Object.keys(base.services)`,
`Object.keys(base.gallery)`) so the form cannot drift from the dictionary as keys
are added. Service / image ids and human labels come from that derivation.

### Wiring (`src/components/admin/SettingsForm.tsx`)

Widen the draft init + patch handlers to the nested namespaces (per-locale
`setSeoFr` / `setSeoEn` patching nested paths immutably).

### Schema (`src/lib/store-settings-schema.ts`)

`SeoOverrideSchema` is already `{ fr?: record(string, unknown), en?: record }`,
permissive enough for the nested shape. **No change expected** — confirm during
implementation; only revisit if round-trip validation rejects nested objects.

---

## Part C — lessons.md note

Append under a new `## SEO layer` heading in `tasks/lessons.md`:

- **Moving a settings namespace silently orphans existing DB overrides.** The
  SEO refactor (`9242623`) moved operator SEO from `content` to a new `seo`
  namespace; the new resolver stopped reading `content.*`, so any legacy DB SEO
  override went silently inert (fell back to static JSON, no error). Lesson:
  when relocating a persisted namespace, add a read-time shim that folds the old
  location forward (and logs when it fires) — don't assume the store is empty.
- **`type SeoDictionary = typeof en` has no compile-time locale-parity guard.**
  Missing keys in `fr.json` become runtime `undefined`, not type errors. Parity
  is enforced only by `src/config/seo/seo-parity.test.ts` — keep it green when
  adding keys. (Same caveat as the UI `Dictionary` type; see AGENTS.md.)

---

## Testing

- **`legacy-seo-shim.test.ts`** (new) — the 3 transforms: `meta` passthrough;
  `serviceDetails → services` with field subsetting (UI copy dropped,
  `schemaDescription` absent); `gallery.photos.{id}.alt → gallery.{id}.alt`
  unwrap. Empty / absent `content` → `{}`. Partial subtrees lift independently.
- **`seo-content.test.ts`** (extend) — legacy `content` folds into the resolved
  SEO; an explicit `seo.{loc}` override beats a colliding legacy leaf; no
  legacy + no `seo` → static base/tenant only (unchanged behaviour).
- **`settings-draft.test.ts`** (new or extend) — `extractSeo` round-trips the
  nested shape; `buildSparseDoc` recursively omits empty service/gallery/meta
  entries and omits `seo` entirely when blank.
- **`seo-parity.test.ts`** — unchanged; must stay green.

All run under `bun test src/` (Playwright stays on `test:e2e` — see lessons.md).

## Sequencing

One spec, one PR. Implementation order: **A** (shim + tests) → **B** (draft
model → SeoSection → SettingsForm) → **C** (lessons). Complexity: **medium**.
No DB migration, no destructive operations.

## Success Criteria

- [ ] A legacy `content.{loc}.meta` DB override renders in page `<title>`/meta
      again (via shim), and a `[seo-shim]` warning names the tenant + keys.
- [ ] An explicit `seo.{loc}` admin edit overrides a colliding legacy value.
- [ ] Admin SeoSection can edit every key in `seo.{locale}.json` (page meta,
      per-service meta/schema/heroAlt, gallery alt, org) for both locales, and
      saved edits round-trip through `buildSparseDoc` / `extractSeo` sparsely.
- [ ] `lessons.md` carries the SEO-layer entry citing `9242623`.
- [ ] `tsc` clean, `bun test src/` green (incl. new tests), lint clean.
