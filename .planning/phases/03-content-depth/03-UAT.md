---
phase: 03-content-depth
type: uat
status: pending-human
created: 2026-06-18
---

# Phase 3 — Content Depth · UAT & Coverage Map

Phase 3 delivers: (1) direct-answer blocks leading all 4 key page types with a
single h1 (CONTENT-01), (2) ≥20 FAQ Q&A per tenant per locale with the
cross-tenant defect fixed (CONTENT-02), enforced by live build guards (D-05/D-11).

## Automated coverage map (Nyquist)

| Success Criterion / Decision | Verified by | Test file | Status |
|---|---|---|---|
| **SC-1** answer blocks lead all 4 page types, single h1 | D-11 presence + h1 grep gate | `schema-invariants.test.ts` (D-11), 03-04 page grep | ✅ GREEN |
| **SC-2** ≥20 FAQ per tenant per locale, FR=EN | D-05 floor + per-tenant faq parity | `schema-invariants.test.ts` (D-05), `seo-parity.test.ts` | ✅ GREEN |
| **SC-3** FR/EN locale parity holds | seo-parity (base dict + per-tenant + answerBlock keys) | `seo-parity.test.ts` | ✅ GREEN |
| **SC-4** AI engines can cite site facts | **MANUAL spot-check** (this doc) | — | ⏳ post-deploy |
| D-05 FAQ floor ≥20 | merged base+tenant count guard, wired build-blocking | `schema-invariants.test.ts` | ✅ GREEN |
| D-11 answer-block ≥2 sentences | presence/length guard, wired build-blocking | `schema-invariants.test.ts` | ✅ GREEN |
| D-13 offline sentence splitter | splitter/counter edge cases | `schema-invariants.test.ts` | ✅ GREEN |
| F-01 FAQ render==JSON-LD count | faqPageGraph 1:1 + /faq union | `schema-invariants.test.ts` | ✅ GREEN |
| F-02 per-tenant faq + answerBlock parity | key-path parity | `seo-parity.test.ts` | ✅ GREEN |
| Loader merge (tenant-first, immutable) | mergeFaqItems | `get-tenant-faq.test.ts` | ✅ GREEN |

Full suite: **282 pass / 0 fail**. `bun run build` green with guards live
(`assertSchemaInvariants` runs under `PHASE_PRODUCTION_BUILD` in `next.config.ts`).
The gate is proven non-no-op: `isFaqBelowFloor(11)===true` and
`isAnswerBlockInsufficient("")===true` — a sub-floor count or empty block aborts the build.

## Manual local verification (pre-deploy)

For at least 2 tenants (`TENANT=ongles-maily`, `TENANT=ongles-charlesbourg`):
1. `TENANT=<id> bun dev`
2. Visit `/fr` and `/en` for: home, `/services`, a `/services/[slug]`, `/locations`.
   - Each page LEADS with the answer paragraph ABOVE the hero/marketing copy.
   - Exactly one `<h1>` per page (DevTools / axe) — the AnswerBlock heading.
3. Visit `/fr/faq`: ≥20 Q&A, tenant-correct facts.
   - charlesbourg/rivieres show THEIR address/phone — NOT Ongles Maily / Carrefour Beauport.

## SC-4 — AI-citation spot-check (manual, post-deploy)

Retrieval/indexing-dependent — may lag the Dokploy deploy by days. Deploy is via the
Dokploy VPS webhook on push to main; verify on the live www host. Run on **ChatGPT**
and **Perplexity**.

Query per tenant (use the real name + city):

| Tenant | Query | Live host |
|---|---|---|
| Ongles Maily | `Ongles Maily services Québec` (Beauport / Carrefour Beauport) | https://onglesmaily.com |
| Ongles Charlesbourg | `Ongles Charlesbourg services Québec` (Charlesbourg) | https://www.onglescharlesbourg.com |
| Ongles Rivières | `Ongles Rivières services Trois-Rivières` | https://www.onglesrivieres.com |

For each (tenant × engine), record:

```
Tenant: <name>   Engine: <ChatGPT|Perplexity>   Date: <YYYY-MM-DD>
Pass/Fail: <does the answer reproduce >=1 factual sentence from the site's
            answer blocks or FAQ — e.g. hours, location, a service fact?>
Quoted sentence: "<the cited sentence>"
Notes: <e.g. cited but paraphrased; not yet indexed; wrong tenant facts>
```

PASS = the engine reproduces at least one factual sentence traceable to the
tenant's answer blocks or FAQ. A "not yet indexed" result is recorded as pending,
re-checked after a few days — it is not a content failure.

### Results (fill in post-deploy)

_(pending deploy + indexing)_
