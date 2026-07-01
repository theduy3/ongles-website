import type { Locale } from "@/lib/i18n";
import type { TenantId } from "@/config";

// The tenant-content registry: the static, build-time source of both the
// dictionary (UI copy) and SEO namespaces, base + per-tenant, for every
// tenant in TENANT_REGISTRY. See CONTEXT.md "Tenant config" / "Layered
// resolution". Keyed by TenantId so the compiler rejects a registered
// tenant left without content or SEO — see tenant-content.test.ts for the
// runtime belt-and-suspenders check.

type Content = Record<string, unknown>;

import contentBaseFr from "@/config/base/content.fr.json";
import contentBaseEn from "@/config/base/content.en.json";
import contentMailyFr from "@/config/tenants/ongles-maily/content.fr.json";
import contentMailyEn from "@/config/tenants/ongles-maily/content.en.json";
import contentCharlesbourgFr from "@/config/tenants/ongles-charlesbourg/content.fr.json";
import contentCharlesbourgEn from "@/config/tenants/ongles-charlesbourg/content.en.json";
import contentRivieresFr from "@/config/tenants/ongles-rivieres/content.fr.json";
import contentRivieresEn from "@/config/tenants/ongles-rivieres/content.en.json";
import contentTemplateFr from "@/config/tenants/template/content.fr.json";
import contentTemplateEn from "@/config/tenants/template/content.en.json";

import seoBaseFr from "@/config/seo/seo.fr.json";
import seoBaseEn from "@/config/seo/seo.en.json";
import seoMailyFr from "@/config/tenants/ongles-maily/seo.fr.json";
import seoMailyEn from "@/config/tenants/ongles-maily/seo.en.json";
import seoCharlesbourgFr from "@/config/tenants/ongles-charlesbourg/seo.fr.json";
import seoCharlesbourgEn from "@/config/tenants/ongles-charlesbourg/seo.en.json";
import seoRivieresFr from "@/config/tenants/ongles-rivieres/seo.fr.json";
import seoRivieresEn from "@/config/tenants/ongles-rivieres/seo.en.json";
import seoTemplateFr from "@/config/tenants/template/seo.fr.json";
import seoTemplateEn from "@/config/tenants/template/seo.en.json";

export const BASE_CONTENT: Record<Locale, Content> = { fr: contentBaseFr, en: contentBaseEn };
export const BASE_SEO: Record<Locale, Content> = { fr: seoBaseFr, en: seoBaseEn };

export const TENANT_CONTENT: Record<TenantId, Record<Locale, Content>> = {
  "ongles-maily": { fr: contentMailyFr, en: contentMailyEn },
  "ongles-charlesbourg": { fr: contentCharlesbourgFr, en: contentCharlesbourgEn },
  "ongles-rivieres": { fr: contentRivieresFr, en: contentRivieresEn },
  template: { fr: contentTemplateFr, en: contentTemplateEn },
};

export const TENANT_SEO: Record<TenantId, Record<Locale, Content>> = {
  "ongles-maily": { fr: seoMailyFr, en: seoMailyEn },
  "ongles-charlesbourg": { fr: seoCharlesbourgFr, en: seoCharlesbourgEn },
  "ongles-rivieres": { fr: seoRivieresFr, en: seoRivieresEn },
  template: { fr: seoTemplateFr, en: seoTemplateEn },
};
