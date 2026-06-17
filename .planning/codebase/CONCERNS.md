# Codebase Concerns

**Analysis Date:** 2026-06-17

## Tech Debt

**Dictionary Parity — Runtime-Only Validation:**
- Issue: Locale dictionary keys (`en.json`, `fr.json`) must maintain identical structure, but this is enforced only at runtime via `type Dictionary = typeof en` which provides no compile-time guard for missing keys in other locales. Keys silently become `undefined` at runtime if not present.
- Files: `src/dictionaries/en.json`, `src/dictionaries/fr.json`, `src/app/[lang]/dictionaries.ts`
- Current state: Both files have 397 matching keys (verified), but future changes risk silent mismatches
- Fix approach: Add a CI check or build-time script that validates key parity before deployment; consider stricter TypeScript types that enforce key presence across all locale files at compile time

**Middleware STANDALONE_PATHS Hardcoded Allowlist:**
- Issue: Locale-exempt widget routes (/checkin, /queue, /clientportal, /subscription) are hardcoded in `src/proxy.ts` line 13-18. Each new standalone route must be manually added to STANDALONE_PATHS or it will be locale-prefixed, breaking functionality.
- Files: `src/proxy.ts` (lines 13-18)
- Impact: New widget pages are fragile — easy to forget the middleware update and silently serve wrong URL
- Fix approach: Generate STANDALONE_PATHS at build time from an authoritative list (e.g., a manifest file or directory scan), or document this as a required checklist item for new standalone routes

**google-reviews.json — Stub Data File:**
- Issue: Build depends on `src/data/google-reviews.json` which initializes as an empty stub (`{ "fetchedAt": null, "aggregate": { "ratingValue": 0, "reviewCount": 0 }, "reviews": [] }`). The fetch script `scripts/fetch-google-reviews.mjs` is manual (run via `npm run fetch:reviews`), not hooked into the build pipeline.
- Files: `src/data/google-reviews.json`, `scripts/fetch-google-reviews.mjs`, `src/lib/reviews.ts`
- Impact: Site renders without real reviews until manually fetched; stub data is safe but misleading. If the fetch script breaks or credentials expire, no alert fires.
- Fix approach: Integrate fetch into the build pipeline (e.g., as a pre-build hook); add validation that the fetch script ran successfully and log a warning if data is stale (> 30 days)

## Known Fragile Areas

**Widget Components — No Test Coverage:**
- What's fragile: Widget wrapper components (`CheckinWidget`, `QueueWidget`, `ClientPortalWidget`, `SubscriptionWidget`) delegate to `WidgetEmbed` which injects third-party scripts imperatively. The injection logic and error/retry behavior have zero test coverage.
- Files: `src/components/CheckinWidget.tsx`, `src/components/QueueWidget.tsx`, `src/components/ClientPortalWidget.tsx`, `src/components/SubscriptionWidget.tsx`, `src/components/WidgetEmbed.tsx`
- Why fragile: WidgetEmbed uses `useEffect` to imperatively append scripts, manage loading state, and handle retries. Changes to dependency arrays or cleanup logic can silently break error recovery. No tests prevent regression.
- Safe modification: Add unit tests for WidgetEmbed covering (1) successful script load, (2) script load failure and retry, (3) cleanup on unmount, (4) Strict Mode double-effect behavior
- Test coverage: Zero for widget components; WidgetEmbed logic is tested only indirectly via E2E

**Tenant Resolution via Runtime Env Var — Static Prerender Risk:**
- What's fragile: Tenant is resolved at runtime from `process.env.TENANT`. The [lang] layout is marked `force-dynamic` to re-resolve per request, but if someone removes this flag or converts a route to static prerender, the build-time tenant gets baked into all prerendered HTML.
- Files: `src/app/[lang]/layout.tsx` (line 36), `src/app/checkin/layout.tsx` (line 13), `src/app/queue/layout.tsx` (line 13), `src/app/clientportal/layout.tsx` (line 14), `src/app/subscription/layout.tsx` (line 14), `src/app/admin/layout.tsx` (line 13)
- Why fragile: The `force-dynamic` export is the ONLY guard; tests verify it's present, but nothing prevents a developer from accidentally removing it while refactoring. Previous issue (per-tenant favicon baked at build time) was a direct consequence.
- Safe modification: Tests already verify `force-dynamic` is present in all affected layouts, which is good; consider adding a lint rule or build check that prevents removal of `force-dynamic` from tenant-aware layouts without explicit override

**Turbopack/Worktree Build Fragility:**
- What's fragile: `next.config.ts` sets `turbopack: { root: __dirname }` (line 35) to tell Turbopack where the project root is. This is necessary when the codebase is symlinked or run from a worktree, but Turbopack still rejects `node_modules` symlinks outside the worktree root. Builds fail with cryptic module resolution errors if node_modules is a symlink pointing to the main checkout.
- Files: `next.config.ts` (line 35)
- Impact: `bun install` in a worktree creates a symlink to node_modules; Turbopack dev/build may fail unless the node_modules is a fresh copy inside the worktree
- Workaround: Copy node_modules into the worktree or set up hooks to auto-copy on entry
- Fix approach: Document this constraint in CONTRIBUTING.md; consider automating worktree setup to create a local node_modules copy

**Custom Code Injection — XSS via Admin Input:**
- What's fragile: `CustomCodeHost` (lines 40-44) uses `document.createRange().createContextualFragment()` to inject admin-authored custom code. While this is safer than `innerHTML`, the code comes from admin settings (stored in Supabase) with minimal validation. If an admin's account is compromised or misconfigured, arbitrary JavaScript runs on all pages.
- Files: `src/components/CustomCodeHost.tsx` (lines 40-44), `src/lib/store-settings-schema.ts`
- Why fragile: No Content Security Policy (CSP) restricts inline scripts; no sandboxing isolates injected code; no script signature/hash validation
- Risk: Medium (admin-only, not public user input), but high impact if exploited
- Safe modification: Add CSP headers that restrict script sources; document that admin access must be protected (strong passwords, 2FA); consider requiring script hashes or allowlist patterns

## Security Considerations

**Email Input Validation — Contact Form:**
- Risk: Contact form (`src/components/ContactForm.tsx`) accepts email from user input and passes it to `sendContactEmail()` which includes it in the `reply_to` field without RFC 5322 validation. Malformed emails could cause Resend API failures or injection.
- Files: `src/components/ContactForm.tsx`, `src/lib/email.ts` (line 42)
- Current mitigation: Form client-side validation (HTML5 type=email); API route re-validates schema via Zod
- Recommendations: Confirm Zod schema validates `email` as a valid RFC 5322 email; log and gracefully handle Resend API 400 responses (currently returns `send_failed` which is correct)

**Admin Session Secret — Missing Length Check in Proxy:**
- Risk: `src/proxy.ts` checks `secret.length < 32` (line 24) but does not verify the secret is set on first startup. If `ADMIN_SESSION_SECRET` is missing, sessions fail gracefully, but there's no startup warning.
- Files: `src/proxy.ts` (lines 23-24), `src/lib/session.ts`
- Current mitigation: Graceful fallback (returns `false`); admin pages require valid session
- Recommendations: Add a startup check in `src/lib/session.ts` that logs a warning if `ADMIN_SESSION_SECRET` is not configured; ensure 32-byte requirement is documented

**Popup Source URL — Unvalidated External Fetch:**
- Risk: `src/app/api/popups/route.ts` (lines 14-23) fetches from `process.env.POPUP_SOURCE_URL` without validating the URL format or response content type. If the URL is compromised, arbitrary JSON runs in the app.
- Files: `src/app/api/popups/route.ts` (lines 14-23)
- Current mitigation: `PopupsSchema.safeParse()` validates the response shape; invalid JSON is silently ignored and fallback is used
- Recommendations: Validate the URL is HTTPS and from an allowlisted domain; add timeout and size limits to the fetch; log successful fetches for audit trail

**JSON-LD Serialization — Safe:**
- Status: No risk. `src/components/JsonLd.tsx` uses `dangerouslySetInnerHTML` only for `JSON.stringify()` output, which is always safe; no untrusted data is serialized.

## Performance Bottlenecks

**Large Files — No Critical Blocker:**
- Problem: `src/lib/seo.ts` (350 lines), `src/app/[lang]/page.tsx` (327 lines), and admin components exceed 250 lines. This is not a bottleneck but indicates potential for splitting.
- Files: `src/lib/seo.ts`, `src/app/[lang]/page.tsx`, `src/components/admin/settings/BookingServicesSection.tsx`, `src/components/admin/PopupForm.tsx`
- Cause: Feature accretion; SEO builders and admin forms combine multiple responsibilities
- Improvement path: Extract SEO meta builders into separate modules; break admin form sections into smaller, composable components (this is already partially done)

**Supabase Client Reuse — Potential N+1 Pattern:**
- Problem: `src/lib/supabase.ts` creates a new client on each import. If routes call multiple Supabase queries, each may instantiate a client.
- Files: `src/lib/supabase.ts`
- Cause: Not a true N+1 (client reuse is per request in Next.js), but unclear if the client is cached across route handlers
- Improvement path: Verify that `unstable_cache()` wrapping Supabase calls (`src/lib/store-config.ts`, `src/lib/store-settings-store.ts`) is actually preventing redundant queries; add observability (e.g., query counts in logs)

## Fragile Areas

**Store Settings Schema — Schema-Test Coupling:**
- Files: `src/lib/store-settings-schema.ts` (200 lines), `src/lib/store-settings-schema.test.ts` (188 lines)
- Why fragile: Schema and tests are tightly coupled; changes to the schema require coordinated test updates. No integration tests verify that admin forms can round-trip all valid schema values.
- Safe modification: Add integration tests that exercise the admin settings form end-to-end; mock Supabase and verify form submission → storage → retrieval cycle

**Admin Form State Management — Draft Handling:**
- Files: `src/lib/settings-draft.ts`, `src/components/admin/SettingsForm.tsx`
- Why fragile: Draft state is stored in localStorage (implicit via settings-draft module). If the schema changes, stale drafts become invalid and may cause silent failures or UI crashes when loaded.
- Safe modification: Add validation in settings-draft that checks draft schema version on load and discards incompatible drafts; log when drafts are purged

## Test Coverage Gaps

**Widget Components:**
- What's not tested: Script injection, error handling, retry logic in `WidgetEmbed`; wrapper components' prop drilling in `CheckinWidget`, `QueueWidget`, `ClientPortalWidget`, `SubscriptionWidget`
- Files: `src/components/CheckinWidget.tsx`, `src/components/QueueWidget.tsx`, `src/components/ClientPortalWidget.tsx`, `src/components/SubscriptionWidget.tsx`, `src/components/WidgetEmbed.tsx`
- Risk: High — Changes to script loading or error recovery can break kiosk functionality without CI detection
- Priority: High

**Admin Settings Form Integration:**
- What's not tested: Full form submission and validation; schema → form → API → storage → retrieval round-trip
- Files: `src/components/admin/SettingsForm.tsx`, `src/components/admin/settings/*.tsx`
- Risk: Medium — Invalid settings could be saved if form validation and API validation diverge
- Priority: Medium

**Custom Code Host Injection:**
- What's not tested: Script injection, deduplication, error cases (malformed HTML, DOM conflicts)
- Files: `src/components/CustomCodeHost.tsx`
- Risk: Medium — Broken or doubled injection could cause layout shifts or script errors
- Priority: Medium

**Popup Schema Validation:**
- What's not tested: Invalid popup JSON from external source; fallback behavior
- Files: `src/app/api/popups/route.ts`, `src/lib/popup.ts`
- Risk: Low (graceful fallback exists), but integration tests would prevent regressions
- Priority: Low

## Dependencies at Risk

**iron-session (^8.0.4):**
- Risk: Session handling is critical for admin auth. Version is not pinned; updates could introduce breaking changes or security issues.
- Impact: Admin access could be disrupted if iron-session releases a major version with API changes
- Migration plan: Pin to exact version or establish a dependency update schedule with testing

**Supabase JS SDK (^2.106.1):**
- Risk: Database, auth, and file uploads depend on this SDK. Version is not pinned; SDK updates could change API or behavior.
- Impact: Store settings, popups, and custom code could fail to load if SDK changes
- Migration plan: Regularly test SDK updates; pin to exact version in production

## Known Issues

**TODO/FIXME Comments — Tenant Configuration Gaps:**
- Symptoms: Multiple secondary tenants (ongles-charlesbourg, ongles-rivieres) have TODO comments for SalonX widget store codes, gift-card URLs, Google Business Profile IDs, and contact emails.
- Files: `src/config/tenants/ongles-charlesbourg/site.ts`, `src/config/tenants/ongles-charlesbourg/services.ts`, `src/config/tenants/ongles-charlesbourg/location.ts`, `src/config/tenants/ongles-rivieres/site.ts`, `src/config/tenants/ongles-rivieres/services.ts`, `src/config/tenants/ongles-rivieres/location.ts`
- Workaround: None; these are configuration blockers for launching secondary tenants
- Priority: Medium (blocks Phase 2 multi-tenant launch)

**Salon Card Cross-Promo:**
- Symptoms: Comment notes that sibling domains (secondary salon locations) are not yet cross-promoted in the SalonCard component.
- Files: `src/components/SalonCard.tsx` (line 182)
- Impact: Users on one tenant site cannot discover other salon locations
- Priority: Low (cosmetic, post-launch feature)

## Missing Critical Features

**Monitored Google Reviews Fetch:**
- Problem: Reviews fetch script is manual and not integrated into the build; no alert if fetch fails or credentials expire. Stub data persists indefinitely.
- Blocks: Accurate review counts and ratings displayed on the site
- Priority: Medium

**Runtime Tenant Validation:**
- Problem: If an invalid `TENANT` env var is set at runtime, the app may error or use incorrect config. No startup validation.
- Blocks: Confidence in multi-container deployments
- Priority: Low (resolveTenant throws on unknown tenant, which is caught by tests, but no startup check)

---

*Concerns audit: 2026-06-17*
