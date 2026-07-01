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
