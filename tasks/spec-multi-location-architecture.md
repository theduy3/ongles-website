<!-- s1 metadata
task-name: multi-location-architecture
scope: large
status: planning
repo: /Users/theduy/Repo/maily-website
created-at: 2026-06-05
-->

# Multi-location architecture: one repo, N branded tenants

## Context

The owner runs a nail business expanding to **4 locations**, each its own brand
(Ongles Maily / Carrefour Beauport, Ongles Charlesbourg, Ongles Rivières, +
a coming-soon Quebec City store). Requirements:

- **Each location its own SEO** — own domain, brand, NAP, services/pricing, meta copy.
- **Shared changes propagate to all** — bug fixes, new features, design, components.
- **No SEO regression / no duplicate-content penalty** across the domains.

The user asked: *should I fork the repo per location?* **No.** Forking creates 4
diverging codebases; every shared fix becomes 4 cherry-picks — which directly
defeats the propagate-everywhere goal.

The repo is already shaped for the alternative: `src/lib/locations.ts` is an
array, SEO is generated from config in `src/lib/seo.ts`, and `src/lib/salons.ts`
already models sibling brands. The work is **de-globalizing the hardcoded single
brand into a tenant resolver**, not a rewrite.

### Decision

**One repo. Config-per-tenant. Build-time tenant selection → one static deploy per domain.**
A `TENANT=<id>` build arg selects which tenant config bakes into the build. One
`main` branch; CI rebuilds all live tenants on every merge → propagation is
automatic. Each domain ships as its own static site (own sitemap, robots,
JSON-LD, `metadataBase`) → Google sees 4 independent local businesses, zero
cross-domain duplicate content, isolated blast radius.

## What propagates vs what is per-tenant

| Concern | Source | Behavior |
|---|---|---|
| Code, components, layout, design, features | shared (one repo) | propagates to all on rebuild |
| Shared UI strings (nav, buttons, generic chrome) | `src/config/base/content.<locale>.json` | propagates |
| Brand name, logo, domain/url, booker, store ID, Google CID, theme | `tenants/<id>/site.ts` | per-tenant |
| NAP, hours, geo, schema hours | `tenants/<id>/location.ts` | per-tenant |
| Services + pricing | `tenants/<id>/services.ts` | per-tenant |
| SEO meta (titles/descriptions) + location landing copy | `tenants/<id>/content.<locale>.json` | per-tenant |

## Architecture

### 1. Tenant registry + config

```
src/config/
  base/
    content.fr.json        // shared UI strings (propagate)
    content.en.json
  tenants/
    ongles-maily/        // current live site, values = today's site.ts/locations.ts exactly
      site.ts              // brand, url, contact, booker, storeId, googleCid, theme, social
      location.ts          // single physical Location (NAP/hours/geo/hoursSpec)
      services.ts          // services + pricing
      content.fr.json      // meta + landing copy overrides
      content.en.json
      assets/logo.*        // per-brand logo
    ongles-charlesbourg/   // seeded from src/lib/salons.ts data
    ongles-rivieres/
    quebec-city/           // coming-soon: in registry, NOT in deploy matrix yet
  index.ts                 // resolves process.env.TENANT -> active config
```

`src/config/index.ts` — build-time resolver over a static registry (keeps SSG +
type safety; no dynamic runtime branching):

```ts
import { onglesMaily } from "./tenants/ongles-maily";
import { onglesCharlesbourg } from "./tenants/ongles-charlesbourg";
import { onglesRivieres } from "./tenants/ongles-rivieres";

const registry = {
  "ongles-maily": onglesMaily,
  "ongles-charlesbourg": onglesCharlesbourg,
  "ongles-rivieres": onglesRivieres,
} as const;

export const tenant = registry[process.env.TENANT ?? "ongles-maily"];
export const site = tenant.site;            // same shape as today's site.ts
export const locations = [tenant.location];  // keep array shape for existing consumers
```

**Minimize consumer churn:** keep `src/lib/site.ts` and `src/lib/locations.ts`
as thin re-exports from `@/config`, so the ~dozen importers don't all change.
The single-brand constants move out of those files into the tenant config.

### 2. Dictionaries: base + per-tenant override (deep merge)

Today `getDictionary(locale)` loads one global `src/dictionaries/<locale>.json`.
Change it to `deepMerge(base/content.<locale>.json, tenant/content.<locale>.json)`.
Shared UI chrome stays in base (propagates); SEO meta + location copy live in the
tenant override. The AGENTS.md **locale-parity rule still applies per tenant** —
`content.fr.json` and `content.en.json` must share key structure within each tenant.

### 3. Services / pricing per tenant

Move services data into `tenants/<id>/services.ts`. `generateStaticParams()` for
`/[lang]/services/[slug]` reads the active tenant's services, so each domain
statically renders only its own service catalog + localized slugs.

### 4. SEO — per-tenant, self-contained

All driven by the resolved tenant config (single tenant per build):

- `metadataBase` (root layout) = `tenant.site.url` → each domain self-canonical.
- `sitemap.ts` / `robots.ts` → reference own host only.
- `organizationGraph()` (`src/lib/seo.ts:135`) → one `NailSalon` LocalBusiness,
  `@id = ${tenant.url}/#business`, own NAP/geo/hours/`sameAs` (own Google CID).
- `pageMetadata()` (`src/lib/seo.ts:38`) → titles/descriptions from tenant content.
- Geo meta in layout (`region/placename/ICBM`) → tenant geo.
- hreflang stays within each host (fr/en alternates of the same domain).

**Duplicate-content safeguard:** distinct brand name, NAP, services, and landing
copy per tenant — never ship the same marketing text across two domains.

### 5. Cross-promo "our other locations"

Replace the static `salons.ts` sister list with a derivation from the tenant
registry minus self. Each live site links to siblings (sibling-brand network,
mild link equity, good UX). Quebec City shows as coming-soon until its domain is live.

### 6. Build + deploy

- `Dockerfile`: add `ARG TENANT` + `ENV TENANT=$TENANT`; pass through to build.
- CI matrix `[ongles-maily, ongles-charlesbourg, ongles-rivieres]` → 4 images →
  4 domains (DNS A/CNAME per domain → its container/host).
- One merge to `main` → matrix rebuilds all live tenants → shared change propagates.
- Quebec City joins the matrix when its domain + data are ready.

## Migration path (incremental, keep the live site green at every step)

- **Phase 1 — extract, no behavior change.** Create `src/config` with a single
  tenant `ongles-maily` holding today's exact `site.ts` + `locations.ts` values.
  Make `@/lib/site` / `@/lib/locations` re-export from `@/config`. Verify build
  output is byte-identical to current. *(small)*
- **Phase 2 — resolver + 2nd/3rd tenants.** Add `process.env.TENANT` resolver +
  registry; seed `ongles-charlesbourg` and `ongles-rivieres` from `salons.ts`.
- **Phase 3 — content split.** Base vs per-tenant dictionaries (deep merge); move
  services/pricing into tenant config.
- **Phase 4 — SEO de-globalize.** sitemap/robots/layout/JSON-LD read tenant config.
- **Phase 5 — ship.** Dockerfile `TENANT` arg + CI matrix + domain wiring; deploy.

## Alternatives considered

- **A — Runtime host multi-tenant** (1 deploy, proxy reads `Host` → tenant).
  Single container is elegant, but bigger refactor, runtime host-routing risk, and
  complicates Next static generation; one bad deploy hits all domains. Rejected for
  a 4-brand small business where static-per-tenant is simpler and SEO-safer.
- **C — Fork per location.** Rejected: 4 diverging codebases; defeats propagation.

## Risks / open items

- **Operational cost:** 4 containers/hosts + 4 domains vs 1. Acceptable; isolates risk.
- **Asset/theme variance:** if brands diverge visually (logo/colors), add a minimal
  per-tenant `theme` token set in `site.ts`; avoid forking components.
- **Admin/Supabase:** popups/newsletter currently single-brand. Confirm whether each
  tenant needs isolated admin data (per-tenant Supabase rows keyed by tenant id) —
  decide in Phase 3.
- **Booking/checkin/queue widgets:** `STORE` must come from `tenant.site.storeId`
  (currently hardcoded `"OM"` in 3 components).

## Verification

1. `TENANT=ongles-charlesbourg bun run build` → static HTML shows Charlesbourg
   brand, NAP, `<title>`, JSON-LD `@id`; `TENANT=ongles-maily bun run build` →
   Beauport values. Confirm no leakage between builds.
2. Per build, inspect `sitemap.xml`, `robots.txt`, root `<title>`, and the single
   `NailSalon` JSON-LD node — all reference that tenant's host only.
3. Chrome DevTools render each build; verify metadata + one LocalBusiness per host;
   booking widget mounts with the tenant's `storeId`.
4. Locale-parity check per tenant: keys of `content.fr.json` == `content.en.json`.
5. Phase 1 gate: diff current vs post-extract build output → identical.
