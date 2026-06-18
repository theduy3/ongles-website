<!-- s1 metadata
task-name: seo-layer-followups
scope: medium
status: complete
repo: /Users/theduy/Repo/maily-website
created-at: 2026-06-06
-->

# SEO Layer Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold orphaned legacy `content`-namespace SEO back into the new `seo` layer at read time, give the admin full edit coverage of every SEO key, and record the lesson.

**Architecture:** A pure `liftLegacySeo()` restructures legacy `content.{locale}` SEO subtrees into the new `seo.{locale}` shape; the resolver deep-merges it UNDER live `seo` edits (legacy = floor, explicit edits win) and warns when it fires. The admin draft model is widened from a flat `meta` record to the full nested `seo.json` shape (`meta`/`services`/`gallery`/`org`), pruned sparsely on save; `SeoSection` renders every key data-driven from the base JSON so it cannot drift.

**Tech Stack:** Next.js (custom build), TypeScript, Zod, React client components, `bun test`, existing `@/config/deep-merge`.

**Key facts confirmed before planning:**
- `deepMerge(base, override)` is a standalone export at `@/config/deep-merge`; override wins on leaf collisions. No `compose-seo.ts` change needed.
- `ContentSectionSchema` / `SeoOverrideSchema` are both `{ fr?: record(string, unknown), en?: record }` — loose, so legacy keys and nested seo objects validate without schema changes.
- `seo-content.test.ts` and `settings-draft.test.ts` already exist (extend them); resolver-shim test goes in a NEW file with its own store mock.

---

## File Structure

- **Create** `src/app/[lang]/legacy-seo-shim.ts` — pure `liftLegacySeo(content)` restructurer (no `server-only`).
- **Create** `src/app/[lang]/legacy-seo-shim.test.ts` — unit tests for the 3 transforms.
- **Modify** `src/app/[lang]/seo-content.ts` — `resolveSeoOverride` folds legacy + warns.
- **Create** `src/app/[lang]/seo-content.shim.test.ts` — resolver fold + precedence (own store mock).
- **Modify** `src/lib/settings-draft.ts` — `SeoDraft` type, `extractSeo`, `emptySeoDraft`, recursive seo prune in `buildSparseDoc`; remove `extractSeoMeta`.
- **Modify** `src/lib/settings-draft.test.ts` — nested extract + recursive prune cases.
- **Modify** `src/components/admin/settings/SeoSection.tsx` — full data-driven grouped fields, `SeoDraft` props.
- **Modify** `src/components/admin/SettingsForm.tsx` — wire nested draft (`extractSeo`, `emptySeoDraft`, `SeoDraft` handlers).
- **Modify** `tasks/lessons.md` — `## SEO layer` entry.

---

## Task 1: `liftLegacySeo` helper (Part A core)

**Files:**
- Create: `src/app/[lang]/legacy-seo-shim.ts`
- Test: `src/app/[lang]/legacy-seo-shim.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/[lang]/legacy-seo-shim.test.ts
import { describe, expect, it } from "bun:test";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";

describe("liftLegacySeo", () => {
  it("passes through legacy meta", () => {
    const out = liftLegacySeo({ meta: { homeTitle: "Legacy" } });
    expect(out.meta).toEqual({ homeTitle: "Legacy" });
  });

  it("renames serviceDetails -> services and keeps only SEO fields", () => {
    const out = liftLegacySeo({
      serviceDetails: {
        "pose-ongles": {
          metaTitle: "T",
          metaDescription: "D",
          heroAlt: "A",
          hygiene: "UI copy — drop",
          whyUs: "UI copy — drop",
        },
      },
    });
    expect(out.services).toEqual({
      "pose-ongles": { metaTitle: "T", metaDescription: "D", heroAlt: "A" },
    });
  });

  it("unwraps gallery.photos.{id}.alt -> gallery.{id}.alt", () => {
    const out = liftLegacySeo({
      gallery: { photos: { "nail-art-1": { alt: "Alt" } } },
    });
    expect(out.gallery).toEqual({ "nail-art-1": { alt: "Alt" } });
  });

  it("returns {} for undefined / empty / non-object input", () => {
    expect(liftLegacySeo(undefined)).toEqual({});
    expect(liftLegacySeo({})).toEqual({});
    expect(liftLegacySeo({ unrelated: "x" })).toEqual({});
  });

  it("omits a service entry that has no SEO fields", () => {
    const out = liftLegacySeo({
      serviceDetails: { "pose-ongles": { hygiene: "only UI copy" } },
    });
    expect(out.services).toBeUndefined();
  });

  it("lifts subtrees independently (meta only, no services/gallery)", () => {
    const out = liftLegacySeo({ meta: { homeTitle: "X" } });
    expect(out.services).toBeUndefined();
    expect(out.gallery).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/app/\[lang\]/legacy-seo-shim.test.ts`
Expected: FAIL — `Cannot find module '@/app/[lang]/legacy-seo-shim'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/[lang]/legacy-seo-shim.ts
type Content = Record<string, unknown>;

// Back-compat shim. Before commit 9242623, operator SEO edits were saved under
// the `content` namespace; the SEO resolver now reads `seo` only, orphaning any
// such legacy DB row. liftLegacySeo() restructures the SEO-bearing subtrees of a
// legacy `content.{locale}` record into the new `seo.{locale}` shape so they keep
// rendering until the data is re-entered via the admin SEO section and this shim
// is removed. Pure: the input is already locale-scoped, so no locale arg.
//
//   meta.{pageKey}                                          -> meta.{pageKey}     (passthrough)
//   serviceDetails.{id}.{metaTitle,metaDescription,heroAlt} -> services.{id}.{..} (subset)
//   gallery.photos.{id}.alt                                 -> gallery.{id}.alt   (unwrap)
// `schemaDescription` (new) and `org` have no legacy source and are not produced.

const SERVICE_SEO_FIELDS = ["metaTitle", "metaDescription", "heroAlt"] as const;

function isPlainObject(v: unknown): v is Content {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function liftLegacySeo(content: Content | undefined): Content {
  if (!isPlainObject(content)) return {};
  const out: Content = {};

  if (isPlainObject(content.meta)) {
    out.meta = { ...content.meta };
  }

  if (isPlainObject(content.serviceDetails)) {
    const services: Content = {};
    for (const [id, detail] of Object.entries(content.serviceDetails)) {
      if (!isPlainObject(detail)) continue;
      const picked: Content = {};
      for (const field of SERVICE_SEO_FIELDS) {
        if (typeof detail[field] === "string") picked[field] = detail[field];
      }
      if (Object.keys(picked).length > 0) services[id] = picked;
    }
    if (Object.keys(services).length > 0) out.services = services;
  }

  if (isPlainObject(content.gallery) && isPlainObject(content.gallery.photos)) {
    const gallery: Content = {};
    for (const [id, photo] of Object.entries(content.gallery.photos)) {
      if (isPlainObject(photo) && typeof photo.alt === "string") {
        gallery[id] = { alt: photo.alt };
      }
    }
    if (Object.keys(gallery).length > 0) out.gallery = gallery;
  }

  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/app/\[lang\]/legacy-seo-shim.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/[lang]/legacy-seo-shim.ts" "src/app/[lang]/legacy-seo-shim.test.ts"
git commit -m "feat: liftLegacySeo shim restructures legacy content SEO into seo shape"
```

---

## Task 2: Wire shim into resolver + warn (Part A)

**Files:**
- Modify: `src/app/[lang]/seo-content.ts:43-46` (`resolveSeoOverride`)
- Test: `src/app/[lang]/seo-content.shim.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// src/app/[lang]/seo-content.shim.test.ts
import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
mock.module("react", () => ({ cache: (fn: (...a: unknown[]) => unknown) => fn }));

// Store row carrying LEGACY content-namespace SEO plus one explicit new-namespace
// `seo` edit that must win on collision.
mock.module("@/lib/store-settings-store", () => ({
  readStoreSettings: async () => ({
    content: {
      en: {
        meta: { homeTitle: "Legacy Home" },
        serviceDetails: {
          "pose-ongles": { metaTitle: "Legacy Service", hygiene: "UI copy" },
        },
        gallery: { photos: { "nail-art-1": { alt: "Legacy Alt" } } },
      },
    },
    seo: { en: { meta: { homeTitle: "New Home" } } },
  }),
}));

const { getSeo } = await import("@/app/[lang]/seo-content");

describe("getSeo — legacy content shim", () => {
  it("lifts legacy serviceDetails.metaTitle into services", async () => {
    const seo = await getSeo("en");
    expect(seo.services["pose-ongles"].metaTitle).toBe("Legacy Service");
  });

  it("explicit seo edit beats legacy on collision", async () => {
    const seo = await getSeo("en");
    expect(seo.meta.homeTitle).toBe("New Home");
  });

  it("unwraps legacy gallery photos alt", async () => {
    const seo = await getSeo("en");
    expect(seo.gallery["nail-art-1"].alt).toBe("Legacy Alt");
  });

  it("drops non-SEO UI copy from lifted service", async () => {
    const seo = await getSeo("en");
    expect(
      (seo.services["pose-ongles"] as Record<string, unknown>).hygiene,
    ).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/app/\[lang\]/seo-content.shim.test.ts`
Expected: FAIL — `seo.meta.homeTitle` is the static base value (legacy not folded), and/or `seo.services["pose-ongles"].metaTitle` is the static base title, not `"Legacy Service"`.

- [ ] **Step 3: Modify `resolveSeoOverride`**

In `src/app/[lang]/seo-content.ts`, add imports near the top (after the existing imports):

```ts
import { deepMerge } from "@/config/deep-merge";
import { liftLegacySeo } from "@/app/[lang]/legacy-seo-shim";
```

Replace the existing `resolveSeoOverride` (lines 43-46):

```ts
async function resolveSeoOverride(locale: Locale): Promise<Content> {
  const settings = await readStoreSettings();
  return (settings?.seo?.[locale] as Content | undefined) ?? {};
}
```

with:

```ts
async function resolveSeoOverride(locale: Locale): Promise<Content> {
  const settings = await readStoreSettings();
  const legacy = liftLegacySeo(settings?.content?.[locale] as Content | undefined);
  const current = (settings?.seo?.[locale] as Content | undefined) ?? {};
  if (Object.keys(legacy).length > 0) {
    // Operational migration signal: surfaces which tenants still carry legacy
    // content-namespace SEO so it can be re-entered via the admin and this shim
    // removed. console.warn (not console.log) is deliberate here.
    console.warn(
      `[seo-shim] lifted legacy content SEO for ${tenant.id}/${locale}: ${Object.keys(
        legacy,
      ).join(", ")}`,
    );
  }
  // Legacy is the floor; explicit `seo` edits win on leaf collisions. The merged
  // result becomes the DB layer passed to composeSeo (base -> tenant -> db).
  return deepMerge(legacy, current);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/app/\[lang\]/seo-content.shim.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the existing seo-content + parity tests (no regressions)**

Run: `bun test src/app/\[lang\]/seo-content.test.ts src/config/seo/seo-parity.test.ts`
Expected: PASS (unchanged behaviour — no legacy/seo in those tests).

- [ ] **Step 6: Commit**

```bash
git add "src/app/[lang]/seo-content.ts" "src/app/[lang]/seo-content.shim.test.ts"
git commit -m "feat: fold legacy content SEO into seo resolver with migration warning"
```

---

## Task 3: Nested admin draft model (Part B core)

**Files:**
- Modify: `src/lib/settings-draft.ts`
- Test: `src/lib/settings-draft.test.ts`

- [ ] **Step 1: Write the failing test** (append to `src/lib/settings-draft.test.ts`)

```ts
import { describe, expect, it } from "bun:test";
import {
  buildSparseDoc,
  extractSeo,
  emptySeoDraft,
  type SettingsDraftState,
} from "@/lib/settings-draft";

function baseDraft(): SettingsDraftState {
  return { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft() };
}

describe("extractSeo", () => {
  it("reads nested meta/services/gallery/org, keeping only strings", () => {
    const d = extractSeo({
      meta: { homeTitle: "H" },
      services: { "pose-ongles": { metaTitle: "T", bogus: 5 } },
      gallery: { "nail-art-1": { alt: "A" } },
      org: { description: "O" },
    });
    expect(d.meta).toEqual({ homeTitle: "H" });
    expect(d.services).toEqual({ "pose-ongles": { metaTitle: "T" } });
    expect(d.gallery).toEqual({ "nail-art-1": { alt: "A" } });
    expect(d.org).toEqual({ description: "O" });
  });

  it("returns an empty draft for undefined", () => {
    expect(extractSeo(undefined)).toEqual(emptySeoDraft());
  });
});

describe("buildSparseDoc — seo", () => {
  it("omits seo entirely when every field is blank", () => {
    const doc = buildSparseDoc(baseDraft());
    expect(doc.seo).toBeUndefined();
  });

  it("recursively omits empty service/gallery/meta entries", () => {
    const d = baseDraft();
    d.seoFr = {
      meta: { homeTitle: "H", servicesTitle: "" },
      services: { "pose-ongles": { metaTitle: "T", metaDescription: "" }, remplissage: {} },
      gallery: { "nail-art-1": { alt: "A" }, "nail-art-2": { alt: "" } },
      org: { description: "" },
    };
    const doc = buildSparseDoc(d);
    expect(doc.seo?.fr).toEqual({
      meta: { homeTitle: "H" },
      services: { "pose-ongles": { metaTitle: "T" } },
      gallery: { "nail-art-1": { alt: "A" } },
    });
    expect(doc.seo?.en).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: FAIL — `extractSeo` / `emptySeoDraft` not exported; existing `seoFr: {}` shape mismatch.

- [ ] **Step 3: Modify `settings-draft.ts`**

Replace the `SeoMeta` type + `SettingsDraftState` interface (top of file) with:

```ts
export interface SeoDraft {
  meta: Record<string, string>;
  services: Record<string, Record<string, string>>;
  gallery: Record<string, Record<string, string>>;
  org: Record<string, string>;
}

export interface SettingsDraftState {
  site: NonNullable<StoreSettings["site"]>;
  services: NonNullable<StoreSettings["services"]>;
  // Full nested SEO override mirroring seo.json, persisted to the SEPARATE `seo`
  // namespace (not `content`). Pruned sparsely by buildSparseDoc.
  seoFr: SeoDraft;
  seoEn: SeoDraft;
}

export function emptySeoDraft(): SeoDraft {
  return { meta: {}, services: {}, gallery: {}, org: {} };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
```

Replace the `// ── seo ──` block inside `buildSparseDoc` with:

```ts
  // ── seo ───────────────────────────────────────────────────────────────
  // Full nested SEO override (meta / services / gallery / org), pruned so empty
  // leaves never freeze over good static defaults at the deep-merge layer.
  const seo: NonNullable<StoreSettings["seo"]> = {};
  const frSeo = buildSeoLocale(draft.seoFr);
  if (hasKeys(frSeo)) seo.fr = frSeo;
  const enSeo = buildSeoLocale(draft.seoEn);
  if (hasKeys(enSeo)) seo.en = enSeo;
  if (hasKeys(seo)) doc.seo = seo;
```

Replace `extractSeoMeta` (bottom of file) with these helpers + `buildSeoLocale` + `extractSeo`:

```ts
/** Drop undefined / empty-string values from a flat string record. */
function pruneStrings(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k in obj) {
    const v = obj[k];
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

/** Prune a nested {id: {field: value}} record: drop empty fields, then empty ids. */
function pruneNested(
  obj: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const id in obj) {
    const fields = pruneStrings(obj[id]);
    if (hasKeys(fields)) out[id] = fields;
  }
  return out;
}

/** Build one locale's sparse seo override from a SeoDraft (empty sections omitted). */
function buildSeoLocale(draft: SeoDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const meta = pruneStrings(draft.meta);
  if (hasKeys(meta)) out.meta = meta;
  const services = pruneNested(draft.services);
  if (hasKeys(services)) out.services = services;
  const gallery = pruneNested(draft.gallery);
  if (hasKeys(gallery)) out.gallery = gallery;
  const org = pruneStrings(draft.org);
  if (hasKeys(org)) out.org = org;
  return out;
}

/** Extract the nested SeoDraft from a seo locale override (may be absent). */
export function extractSeo(locale: Record<string, unknown> | undefined): SeoDraft {
  const src = locale ?? {};
  const flat = (o: unknown): Record<string, string> => {
    if (!isPlainObject(o)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) if (typeof v === "string") out[k] = v;
    return out;
  };
  const nested = (o: unknown): Record<string, Record<string, string>> => {
    if (!isPlainObject(o)) return {};
    const out: Record<string, Record<string, string>> = {};
    for (const [id, fields] of Object.entries(o)) out[id] = flat(fields);
    return out;
  };
  return {
    meta: flat(src.meta),
    services: nested(src.services),
    gallery: nested(src.gallery),
    org: flat(src.org),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/lib/settings-draft.test.ts`
Expected: PASS (existing site/services cases + new seo cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings-draft.ts src/lib/settings-draft.test.ts
git commit -m "feat: nested SeoDraft model with extractSeo + recursive sparse prune"
```

---

## Task 4: Full-coverage SeoSection + form wiring (Part B UI)

**Files:**
- Modify: `src/components/admin/settings/SeoSection.tsx` (full rewrite)
- Modify: `src/components/admin/SettingsForm.tsx` (wiring)

- [ ] **Step 1: Rewrite `SeoSection.tsx`** (data-driven from base seo.en.json)

```tsx
"use client";

import baseSeo from "@/config/seo/seo.en.json";
import type { SeoDraft } from "@/lib/settings-draft";
import { inputClass, labelClass, spanClass } from "./BrandSeoSection";

// Key sets derive from the base SEO JSON so the form can never drift from the
// dictionary as keys are added. Labels are cosmetic (humanized from the key).
const META_KEYS = Object.keys(baseSeo.meta);
const SERVICE_IDS = Object.keys(baseSeo.services);
const SERVICE_FIELDS = ["metaTitle", "metaDescription", "schemaDescription", "heroAlt"] as const;
const GALLERY_IDS = Object.keys(baseSeo.gallery);

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function LocaleSeoFields({
  locale,
  value,
  onChange,
}: {
  locale: string;
  value: SeoDraft;
  onChange: (next: SeoDraft) => void;
}) {
  const setMeta = (k: string, v: string) =>
    onChange({ ...value, meta: { ...value.meta, [k]: v } });
  const setService = (id: string, field: string, v: string) =>
    onChange({
      ...value,
      services: { ...value.services, [id]: { ...value.services[id], [field]: v } },
    });
  const setGallery = (id: string, v: string) =>
    onChange({
      ...value,
      gallery: { ...value.gallery, [id]: { ...value.gallery[id], alt: v } },
    });
  const setOrg = (v: string) =>
    onChange({ ...value, org: { ...value.org, description: v } });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Page meta</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {META_KEYS.map((k) => (
            <label key={`${locale}-meta-${k}`} className={labelClass}>
              <span className={spanClass}>{humanize(k)}</span>
              <input
                className={inputClass}
                value={value.meta[k] ?? ""}
                onChange={(e) => setMeta(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Per-service</p>
        {SERVICE_IDS.map((id) => (
          <div key={`${locale}-svc-${id}`} className="mb-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-tan">{id}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICE_FIELDS.map((f) => (
                <label key={`${locale}-svc-${id}-${f}`} className={labelClass}>
                  <span className={spanClass}>{humanize(f)}</span>
                  <input
                    className={inputClass}
                    value={value.services[id]?.[f] ?? ""}
                    onChange={(e) => setService(id, f, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Gallery alt</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {GALLERY_IDS.map((id) => (
            <label key={`${locale}-gal-${id}`} className={labelClass}>
              <span className={spanClass}>{id}</span>
              <input
                className={inputClass}
                value={value.gallery[id]?.alt ?? ""}
                onChange={(e) => setGallery(id, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-mocha">Organization</p>
        <label className={labelClass}>
          <span className={spanClass}>Description</span>
          <input
            className={inputClass}
            value={value.org.description ?? ""}
            onChange={(e) => setOrg(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

interface Props {
  seoFr: SeoDraft;
  seoEn: SeoDraft;
  onSeoFrChange: (next: SeoDraft) => void;
  onSeoEnChange: (next: SeoDraft) => void;
}

export function SeoSection({ seoFr, seoEn, onSeoFrChange, onSeoEnChange }: Props) {
  return (
    <fieldset className="rounded-xl border border-fog bg-beige/60 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-mocha">
        SEO
      </legend>

      <p className="mt-3 mb-2 text-xs font-semibold text-mocha">SEO — FR</p>
      <LocaleSeoFields locale="fr" value={seoFr} onChange={onSeoFrChange} />

      <p className="mt-5 mb-2 text-xs font-semibold text-mocha">SEO — EN</p>
      <LocaleSeoFields locale="en" value={seoEn} onChange={onSeoEnChange} />
    </fieldset>
  );
}
```

- [ ] **Step 2: Update `SettingsForm.tsx` wiring**

Change the import on line 6 from:

```ts
import { buildSparseDoc, extractSeoMeta, type SettingsDraftState } from "@/lib/settings-draft";
```

to:

```ts
import {
  buildSparseDoc,
  extractSeo,
  emptySeoDraft,
  type SeoDraft,
  type SettingsDraftState,
} from "@/lib/settings-draft";
```

Delete the now-unused `type SeoMeta = Record<string, unknown>;` line.

Replace `emptyState()`:

```ts
function emptyState(): SettingsDraftState {
  return { site: {}, services: [], seoFr: emptySeoDraft(), seoEn: emptySeoDraft() };
}
```

Replace the two `extractSeoMeta(...)` lines in `stateFromSettings`:

```ts
    seoFr: extractSeo(s.seo?.fr as Record<string, unknown> | undefined),
    seoEn: extractSeo(s.seo?.en as Record<string, unknown> | undefined),
```

Update the two setter signatures (around lines 72-79) from `SeoMeta` to `SeoDraft`:

```ts
  function setSeoFr(next: SeoDraft) {
    setDraft((prev) => ({ ...prev, seoFr: next }));
  }

  function setSeoEn(next: SeoDraft) {
    setDraft((prev) => ({ ...prev, seoEn: next }));
  }
```

(The `<SeoSection .../>` JSX usage on lines 140-144 is unchanged — prop names match.)

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck` (or `npx tsc --noEmit`)
Expected: clean — no references to removed `extractSeoMeta` / `SeoMeta`.

- [ ] **Step 4: Build (admin route compiles, JSON import bundles)**

Run: `bun run build`
Expected: success; both locales prerender for all 3 tenants (existing behaviour).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/settings/SeoSection.tsx src/components/admin/SettingsForm.tsx
git commit -m "feat: admin SeoSection edits full SEO key set (meta/services/gallery/org)"
```

---

## Task 5: lessons.md note (Part C)

**Files:**
- Modify: `tasks/lessons.md`

- [ ] **Step 1: Append a new section** at the end of `tasks/lessons.md`

```markdown
## SEO layer (commit 9242623)

- **Moving a persisted settings namespace silently orphans existing DB overrides.**
  The SEO refactor moved operator SEO from the `content` namespace to a new `seo`
  namespace; the new resolver stopped reading `content.*`, so any legacy DB SEO
  override went silently inert — it fell back to static JSON with no error. Fix:
  a read-time shim (`src/app/[lang]/legacy-seo-shim.ts`) folds the old location
  forward and `console.warn`s `[seo-shim]` when it fires so the tenant can be
  migrated and the shim deleted. Rule: when relocating a persisted namespace,
  ship a forward-fold shim — never assume the store is empty. (seo-layer-followups)
- **`type SeoDictionary = typeof en` gives no compile-time locale-parity guard.**
  Keys missing from `fr.json` become runtime `undefined`, not type errors —
  identical caveat to the UI `Dictionary` type (see AGENTS.md). Parity is enforced
  only by `src/config/seo/seo-parity.test.ts`; keep it green when adding keys.
  (seo-layer-followups)
```

- [ ] **Step 2: Commit**

```bash
git add tasks/lessons.md
git commit -m "docs: lessons note on namespace-move orphaning + no parity compile guard"
```

---

## Task 6: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `bun test src/`
Expected: all pass — includes `legacy-seo-shim`, `seo-content.shim`, `seo-content`, `settings-draft`, `seo-parity`.

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: clean — confirm no `no-console` violation on the deliberate `console.warn` (repo config allows `warn`/`error`; if it flags, add a scoped `// eslint-disable-next-line no-console` above the warn with a comment).

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: success; prerenders both locales for all 3 tenants.

- [ ] **Step 5: Final confirmation against success criteria**

Confirm each spec success criterion is met (legacy fold renders + warns, explicit seo beats legacy, admin edits every key sparsely, lessons entry present, tsc/test/lint/build green).

---

## Self-Review

**Spec coverage:**
- Part A (shim) → Tasks 1 (helper) + 2 (resolver wiring + warn). ✓
- Part B (admin full coverage) → Tasks 3 (draft model) + 4 (UI + wiring). ✓
- Part C (lessons) → Task 5. ✓
- Testing section → tests embedded in Tasks 1-3, gate in Task 6. ✓
- Non-goals respected: no destructive migration, no `org` legacy map, no schema change, no new fields. ✓

**Type consistency:** `SeoDraft` (meta/services/gallery/org as string records) defined in Task 3, consumed identically in Task 4 props + `SettingsForm`. `liftLegacySeo(content)` single-arg used consistently in Tasks 1 & 2. `extractSeo` / `emptySeoDraft` / `buildSeoLocale` names match across tasks. `extractSeoMeta` removed in Task 3 and its last caller updated in Task 4. ✓

**Placeholder scan:** every code step shows full code; commands have expected output; no TBD/TODO. ✓

**Known risk:** Task 6 Step 3 — if ESLint's `no-console` is set to error with no `warn` allowance, the lint step fails; the step documents the scoped disable as the fix. ✓
