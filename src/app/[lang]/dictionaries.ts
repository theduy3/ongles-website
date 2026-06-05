import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { composeDictionary } from "@/app/[lang]/compose-dictionary";
import baseFr from "@/config/base/content.fr.json";
import baseEn from "@/config/base/content.en.json";
import mailyFr from "@/config/tenants/ongles-maily/content.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/content.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/content.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/content.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/content.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/content.en.json";

// The dictionary is composed at request time from THREE layers:
//   1. BASE    — shared UI chrome, identical for every tenant
//   2. TENANT  — static per-tenant SEO meta + brand copy (build-time JSON)
//   3. DB      — live operator edits stored in Supabase (runtime, cached 60 s)
// Each layer deep-merges over the previous; DB wins on leaf collisions.
// Locale parity (fr ⇔ en key structure) holds within each layer — see AGENTS.md.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

// Per-tenant content overrides. Each tenant supplies its own SEO meta + brand copy.
const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
};

// composeDictionary lives in ./compose-dictionary (no server-only dep, testable).
// Re-exported here so existing callers importing from dictionaries.ts still work.
export { composeDictionary };

// ── DB content override resolver ──────────────────────────────────────────────
// Reads the `content` section of the store settings doc for the active tenant
// and returns the per-locale override (or {} when absent / no DB).
//
// Caching strategy mirrors store-config.ts:
//   - unstable_cache: cross-request Next.js cache (60 s TTL) tagged so admin
//     writes can call revalidateTag(`store-content:${tenant.id}`) to purge.
//   - React cache: per-request dedupe so multiple getDictionary("fr") calls in
//     the same render tree only hit the Next.js cache once per locale.
//   - try/catch fallback: unstable_cache throws outside Next.js server runtime
//     (e.g. bun:test). We run the uncached resolver transparently so tests work.

async function resolveContentOverride(locale: Locale): Promise<Content> {
  const settings = await readStoreSettings();
  return (settings?.content?.[locale] as Content | undefined) ?? {};
}

const cachedResolveContentOverride = unstable_cache(
  resolveContentOverride,
  ["store-content", tenant.id],
  {
    tags: [`store-content:${tenant.id}`],
    revalidate: 60,
  },
);

async function resolveContentOverrideWithFallback(locale: Locale): Promise<Content> {
  try {
    return await cachedResolveContentOverride(locale);
  } catch {
    // Outside a Next.js runtime (tests, scripts) — run uncached.
    return resolveContentOverride(locale);
  }
}

// React cache wraps the fallback so multiple calls with the same locale in one
// render tree are deduped to a single await.
const getContentOverride = cache(resolveContentOverrideWithFallback);

// ── Public API ────────────────────────────────────────────────────────────────

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const tenantOverride = overrides[tenant.id]?.[locale] ?? {};
  const dbOverride = await getContentOverride(locale);
  return composeDictionary(base[locale], tenantOverride, dbOverride) as unknown as Dictionary;
};
