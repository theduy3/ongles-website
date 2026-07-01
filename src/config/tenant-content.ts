import type { Locale } from "@/lib/i18n";
import { TENANT_REGISTRY, type TenantId } from "@/config";

// The tenant-content registry: base (build-time defaults) + per-tenant content
// and SEO namespaces. See CONTEXT.md "Tenant config" / "Layered resolution".
//
// Per-tenant assets now live on the SINGLE registry seam — each tenant's
// index.ts imports its own content/seo JSON (src/config/tenants/<id>/index.ts) —
// so TENANT_CONTENT / TENANT_SEO are DERIVED from TENANT_REGISTRY here, not
// re-listed. A tenant registered without content/seo fails to compile at its
// index.ts (the `.content` / `.seo` access below is missing on that member);
// tenant-content.test.ts keeps the runtime belt-and-suspenders check. Base
// namespaces are NOT per-tenant, so they stay direct imports.

type Content = Record<string, unknown>;

import contentBaseFr from "@/config/base/content.fr.json";
import contentBaseEn from "@/config/base/content.en.json";
import seoBaseFr from "@/config/seo/seo.fr.json";
import seoBaseEn from "@/config/seo/seo.en.json";

export const BASE_CONTENT: Record<Locale, Content> = { fr: contentBaseFr, en: contentBaseEn };
export const BASE_SEO: Record<Locale, Content> = { fr: seoBaseFr, en: seoBaseEn };

export const TENANT_CONTENT = Object.fromEntries(
  Object.entries(TENANT_REGISTRY).map(([id, t]) => [id, t.content]),
) as unknown as Record<TenantId, Record<Locale, Content>>;

export const TENANT_SEO = Object.fromEntries(
  Object.entries(TENANT_REGISTRY).map(([id, t]) => [id, t.seo]),
) as unknown as Record<TenantId, Record<Locale, Content>>;
