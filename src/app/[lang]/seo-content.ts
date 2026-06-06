import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Locale } from "@/lib/i18n";
import type { SeoDictionary } from "@/lib/seo-dictionary";
import { tenant } from "@/config";
import { readStoreSettings } from "@/lib/store-settings-store";
import { composeSeo } from "@/app/[lang]/compose-seo";
import baseFr from "@/config/seo/seo.fr.json";
import baseEn from "@/config/seo/seo.en.json";
import mailyFr from "@/config/tenants/ongles-maily/seo.fr.json";
import mailyEn from "@/config/tenants/ongles-maily/seo.en.json";
import charlesbourgFr from "@/config/tenants/ongles-charlesbourg/seo.fr.json";
import charlesbourgEn from "@/config/tenants/ongles-charlesbourg/seo.en.json";
import rivieresFr from "@/config/tenants/ongles-rivieres/seo.fr.json";
import rivieresEn from "@/config/tenants/ongles-rivieres/seo.en.json";

// The SEO doc is composed at request time from THREE layers, exactly like the
// dictionary (dictionaries.ts) but in a SEPARATE namespace so SEO is authored
// and edited independently of UI copy:
//   1. BASE    — canonical full key set (also the SeoDictionary type source)
//   2. TENANT  — per-tenant SEO (page meta, service meta, org, gallery alt)
//   3. DB      — live operator SEO edits (Supabase `seo` section, cached 60 s)
// Each layer deep-merges over the previous; DB wins on leaf collisions.
// Locale parity (fr ⇔ en key structure) holds within each layer — see AGENTS.md.

type Content = Record<string, unknown>;

const base: Record<Locale, Content> = { fr: baseFr, en: baseEn };

const overrides: Record<string, Record<Locale, Content>> = {
  "ongles-maily": { fr: mailyFr, en: mailyEn },
  "ongles-charlesbourg": { fr: charlesbourgFr, en: charlesbourgEn },
  "ongles-rivieres": { fr: rivieresFr, en: rivieresEn },
};

// ── DB SEO override resolver ───────────────────────────────────────────────────
// Reads the `seo` section of the store settings doc for the active tenant and
// returns the per-locale override (or {} when absent / no DB). Caching mirrors
// dictionaries.ts: unstable_cache (60 s, tag `store-seo:<id>`) + React cache +
// try/catch fallback for non-Next.js runtimes (bun:test).

async function resolveSeoOverride(locale: Locale): Promise<Content> {
  const settings = await readStoreSettings();
  return (settings?.seo?.[locale] as Content | undefined) ?? {};
}

const cachedResolveSeoOverride = unstable_cache(
  resolveSeoOverride,
  ["store-seo", tenant.id],
  {
    tags: [`store-seo:${tenant.id}`],
    revalidate: 60,
  },
);

async function resolveSeoOverrideWithFallback(locale: Locale): Promise<Content> {
  try {
    return await cachedResolveSeoOverride(locale);
  } catch {
    // Outside a Next.js runtime (tests, scripts) — run uncached.
    return resolveSeoOverride(locale);
  }
}

const getSeoOverride = cache(resolveSeoOverrideWithFallback);

// ── Public API ────────────────────────────────────────────────────────────────

export const getSeo = async (locale: Locale): Promise<SeoDictionary> => {
  const tenantOverride = overrides[tenant.id]?.[locale] ?? {};
  const dbOverride = await getSeoOverride(locale);
  return composeSeo(base[locale], tenantOverride, dbOverride) as unknown as SeoDictionary;
};
