# Domain glossary — ongles-website

Ubiquitous language for the multi-tenant nail-salon site. Names good seams so
architecture reviews and code speak the same words. Keep terms here in sync with
the code that implements them.

## Tenancy

- **Tenant** — one branded salon deployment. Selected at runtime via `process.env.TENANT`
  (one universal image; each container sets its own). Registry in `src/config/index.ts`.
- **Tenant config** — the static, build-time source of truth for a tenant: `site`,
  `location`, `services`, review data, FAQ, SEO copy. Lives under `src/config/tenants/<id>/`.
- **Store settings** — the runtime, operator-editable override doc (Supabase, one row per
  tenant), deep-merged over tenant config. Sparse: only fields that differ are stored.
- **Resolved config** — tenant config with store-settings merged in, for one request.

## Layered resolution

Every request-time tenant read is a **layered resolution**: static defaults with the
operator's live edits merged on top, cached per request and per deployment.

- **Cached tenant resource** — the caching seam shared by all resolvers
  (`src/lib/cached-tenant-resource.ts`): `unstable_cache` (cross-request, 60 s, tag-purged
  on admin write) wrapped by React `cache` (per-request dedupe). A resolver error
  propagates on its first throw — the seam adds no swallow/retry.
- **Store read resolution** — the pure decision that turns an already-fetched Supabase
  read response (`{ data, error }`) into either a degraded value or a `StoreResult`
  envelope, WITHOUT a client. Two temperaments: the **public** read degrades to `null` on
  error / missing row / corrupt doc (silent — the caller falls through to static config);
  the **admin** read surfaces a query error or corrupt doc as `failed` (loud — the operator
  must see corruption), and a missing row as `ok(null)` (a fresh tenant). Lives beside each
  store (`resolvePublicRead`/`resolveAdminRead` in `store-settings-store.ts`, `parseRows` in
  `popups-store.ts`); the IO shell fetches, these decide, so the degrade contract is tested
  through plain data. Query wiring (table, `tenant_id` scoping) stays in the untested shell.
- **Layered locale content** — the per-locale content resolver factory
  (`src/app/[lang]/layered-locale-content.ts`) shared by the dictionary and SEO namespaces:
  composes **base → tenant → db** (`deepMerge` chain, later layers win on leaf collisions)
  for one locale. The settings reader is injected so the layering is testable without a DB.
  `store-config` does NOT use this — it merges services by id (`mergeServicesById`), a
  different shape, and only shares the cached-tenant-resource seam.

## Review honesty

- **Review data** — the fetched Google-reviews record for a tenant:
  `{ fetchedAt, aggregate: { ratingValue, reviewCount }, reviews[] }`. Populated by
  `scripts/fetch-google-reviews.mjs` into `src/config/tenants/<id>/google-reviews.json`.
  Fetched OUT-OF-BAND — never part of the store-settings merge (not operator-editable).
  `fetchedAt: null` = stub / never fetched.
- **The R-02 gate** — the honesty rule that decides whether structured data may publish a
  rating: emit `AggregateRating` (and individual `Review` nodes) ONLY when
  `fetchedAt !== null AND aggregate.reviewCount >= 5`. Below that, emit nothing. The
  threshold (**5**) and the rule are ONE decision — publishing a fabricated or thin rating
  violates Google's review-snippet policy (integrity invariant T-02-01).
- **Review schema fragment** — the JSON-LD emission gated by the R-02 gate: the
  `{ aggregateRating?, review? }` object spread into the business node of the
  `organizationGraph`. One gate evaluation drives both keys.
