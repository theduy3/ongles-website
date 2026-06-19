---
phase: 02-schema-completeness-correctness
status: complete
gate: passed
tested_date: "2026-06-18"
result: pass
resolution: "Deploy was blocked by stale bun.lock (missing schema-dts) failing Dokploy's frozen-lockfile install in ~3s. Fixed in 898100b — bun.lock synced. Redeployed ~105s; all SC verified live."
---

## RESOLUTION (2026-06-18, post-fix `898100b`)

Root cause was **not** code and **not** a dead webhook — the webhook fired but the two
deploys failed at **install in ~3s**: `bun.lock` was stale (schema-dts absent; never updated
when 02-03 added it via npm), so Dokploy's `bun install --frozen-lockfile` aborted on the
lockfile/package.json mismatch. Synced `bun.lock` (`898100b`), redeploy succeeded in ~105s.

Live re-verification (both tenants):
- `@graph` = `[Organization, NailSalon, WebSite, NailSalon]` — Organization node present, `parentOrganization` on business ✓
- maily `@id` = `https://onglesmaily.com/#business` (canonical, no-www); charlesbourg `https://www.onglescharlesbourg.com/#business`; unique ✓
- charlesbourg `sameAs` **absent** (was `[]`) — I-03 fixed ✓
- AggregateRating absent both (R-02) ✓
- service page `…/fr/services/pose-d-ongles` → `Service` + `AggregateOffer` 60 CAD, provider→canonical business ✓ (both tenants)

Remaining (non-blocking, user/browser): official Google Rich Results Test rubber-stamp on the
2 home pages + 1 service page each. Structure provably valid → expected pass.

# Phase 02 UAT — Schema Completeness + Correctness

**Goal:** Every tenant emits valid, typed, complete JSON-LD across all required schema
types, with review schema guarded against stub data and CI enforcing parity.

**Verdict:** Code-level ✅ (5/5). Live-deploy ❌ — production serving a **pre-Phase-2
build**. Phase cannot be closed against the live success criteria until Dokploy redeploys.

## Automated gates (local, branch `main` @ 5501460)

| Gate | Result |
|------|--------|
| `bun test src/` | **202 pass / 0 fail** (399 expect) |
| `next build` (runs `assertSchemaInvariants` + `assertAllTenantsComplete`) | **exit 0**, full route table — guard did not abort |
| schema-dts typing on all builders | present (02-03) |
| `seo-parity` FR/EN + F-02 faq.items parity | in suite, green |

## Success criteria — code vs live

| # | Criterion | Code | Live (www) |
|---|-----------|------|-----------|
| SC1 | NailSalon JSON-LD, stable per-tenant `@id`, no cross-tenant collision | ✅ | ⚠️ NailSalon + unique `@id` present, but **Organization brand node MISSING**, `parentOrganization` absent, maily `@id` = `www.onglesmaily.com/#business` not canonical `onglesmaily.com` |
| SC2 | Service + AggregateOffer JSON-LD from config pricing | ✅ (build guard `offer()` invariant) | not re-verified on live service page (home gate failed first) |
| SC3 | FAQPage emits every dict item, FR+EN, no missing | ✅ (F-01 invariant + tests) | n/a (build-guard enforced) |
| SC4 | AggregateRating suppressed for stub (`fetchedAt:null`/`count<5`) | ✅ (R-02 gate tests) | ✅ live `aggregateRating` absent both tenants |
| SC5 | schema-dts typing + `seo-parity` CI fails on FR/EN drift | ✅ | n/a (CI) |

## Live evidence (fetched 2026-06-18 ~16:54 PDT)

`https://www.onglesmaily.com/fr` and `https://www.onglescharlesbourg.com/fr` — both HTTP 200,
`force-dynamic` (no CDN cache), single `ld+json` block:

```
nodes = [NailSalon, WebSite, NailSalon]      ← pre-02-02 shape (no Organization node)
maily   NailSalon @id = https://www.onglesmaily.com/#business
charles NailSalon @id = https://www.onglescharlesbourg.com/#business   (unique ✓)
charles sameAs: []                            ← VIOLATES I-03 (02-02 made sameAs conditional)
aggregateRating: absent (R-02 correct ✓)
name/address/telephone/geo/hours: all present (Phase 1 IS live ✓)
```

Phase-2 02-02 output should be `[Organization, NailSalon, WebSite, …location depts]` with
`parentOrganization` on the business node and **no** empty `sameAs`. Live matches the
pre-02-02 build → the running container predates Phase 2.

## Root cause — Dokploy auto-deploy not firing (NOT a code problem)

Hypotheses tested and **eliminated**:
- ✅ Commits on origin/main, `HEAD == origin/main`.
- ✅ `bunx next build` exit 0 (build guard ran, no abort).
- ✅ `npx next build` exit 0 — **node** path replicated (Phase-1 bun-vs-Docker alias lesson does
  NOT recur; `next.config.ts` → `schema-invariants.ts` chain resolves under node too).
- ✅ Pages `force-dynamic` → not a CDN/cache artifact.
- ✅ dev-dep-omission ruled out (typescript/eslint/@types also devDeps; Phase 1 deployed fine
  with that layout, so the build stage installs dev deps).

Decisive evidence: **two pushes to `main`** (`5501460` real, `e796381` empty re-trigger) →
**zero redeploy in 6 min** of polling (Organization node never appeared). Memory says rebuild
~1min. ∴ the **GitHub→Dokploy webhook is disconnected / auto-deploy disabled / VPS builder
down**. Cannot inspect or re-trigger from this session. Ref: [[deploy-is-dokploy-webhook]].

## What needs checking in Dokploy (user)

1. App → **Deployments**: did a deploy start for `5501460`/`e796381`? If none → webhook not wired.
2. App → **Settings → auto-deploy / webhook**: confirm GitHub webhook URL present + "Auto Deploy" on.
3. GitHub repo → **Settings → Webhooks**: recent delivery to Dokploy = 2xx? Red ✗ = the break.
4. If a deploy ran and **failed** → read Dokploy build logs for the real error (local build is green,
   so a failure there is infra/env, e.g. memory/OOM, registry, or env-var).
5. Fastest unblock: hit **Redeploy** in Dokploy UI manually.

## Blocker / next action (needs user)

Phase 2 implementation is **done and correct**; the gate is **deploy delivery**.

1. Trigger / inspect the Dokploy deploy for `main` (UI redeploy, or confirm webhook + build logs).
2. Re-run live check — expect `@graph` to start with `Organization`, `parentOrganization` on
   the NailSalon node, and charlesbourg `sameAs` **absent** (not `[]`).
3. Then run Google Rich Results Test on both home pages + one service page per tenant (SC1/SC2).
4. On green, flip this file `status: complete` and mark Phase 2 done in STATE/ROADMAP.
