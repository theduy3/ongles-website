# Human tasks — wire GBP secrets so the weekly review fetch works

**Owner:** you (browser + Google consent steps Claude cannot do).
**Goal:** populate the 7 required GitHub Actions secrets so `.github/workflows/fetch-reviews.yml`
(Mondays 06:00 UTC) fetches real Google reviews, commits per-tenant JSON, and pushes to `main`
→ Dokploy auto-deploys → schema.org **Review nodes** + on-page **real reviews** light up together.

## Current state (verified 2026-07-09)

- Workflow exists and runs green weekly — but it's a **no-op**. Last run (2026-07-06) logged
  `skipping <tenant> — GBP location id secret not set` for all three tenants.
- `gh secret list` on `theduy3/ongles-website` = **empty**. Zero secrets set.
- No `.env*` locally. The values exist nowhere yet — all must be minted from Google's side.
- `main` has no branch protection → the workflow's `git push` will work.

## The two blockers

1. **Legacy v4 API access.** Reviews live ONLY on My Business v4
   (`mybusinessgoogleapis.com/v4/.../reviews` — `scripts/fetch-google-reviews.mjs:87`). Not in the
   Cloud Console API Library; needs the **Business Profile API access request form** approved
   per Cloud project (days–weeks). Until approved, a valid token still gets `403` on reviews.
   → Account/location *discovery* does NOT need v4 (uses v1 APIs, enablable today). Only the
   review *fetch* waits on approval.
2. **Three separate Google accounts** (Maily / Charlesbourg / Rivières). A refresh token is
   scoped to ONE login. See "Account strategy" below — must resolve before minting the token.

## Account strategy — DECIDE FIRST

Three GBP listings under three logins. One refresh token sees only one login's listings.

- **Option A (recommended, ZERO code changes):** Pick one fetcher identity (e.g.
  `onglesmailyqc@gmail.com`). From the Charlesbourg + Rivières accounts, invite that identity as
  **Manager** on each listing. Then `accounts.list` for the one login returns all three account
  resources. Uses the per-tenant `GBP_ACCOUNT_*` overrides (rows 8–10) — that's their whole point.
- **Option B (avoid):** Three refresh tokens. Requires editing BOTH `fetch-reviews.yml` and
  `fetch-google-reviews.mjs` (script reads `GOOGLE_OAUTH_REFRESH_TOKEN` once). Three consent
  flows, three tokens to rotate/expire. Only if salons legally can't cross-manage.

**Open question:** are the 3 listings under 3 separate Google *logins*, or 3 GBP *account
resources* one login already manages? UI calls both "accounts." If the latter → already Option A;
just run `accounts.list` to confirm.

## Secrets table (assuming Option A)

| # | Secret | Required | Shape | Source | Status |
|---|---|---|---|---|---|
| 1 | `GOOGLE_OAUTH_CLIENT_ID` | yes | `…-abc.apps.googleusercontent.com` | Cloud Console → Credentials → **Desktop** OAuth client | not created |
| 2 | `GOOGLE_OAUTH_CLIENT_SECRET` | yes | `GOCSPX-…` | same screen | not created |
| 3 | `GOOGLE_OAUTH_REFRESH_TOKEN` | yes | `1//0g…` | consent flow: scope `https://www.googleapis.com/auth/business.manage`, `access_type=offline`, `prompt=consent` | not minted |
| 4 | `GOOGLE_BUSINESS_ACCOUNT_ID` | yes | ~21 digits | `accounts.list` — fallback for Maily | **`6940314991` is SUSPECT (10 digits = looks like Google Ads customer id, not GBP)** |
| 5 | `GBP_LOCATION_ONGLES_MAILY` | yes | ~20 digits | `accounts/{id}/locations` | `12380912253303086145` — plausible, UNVERIFIED (pulled from page JS) |
| 6 | `GBP_LOCATION_ONGLES_CHARLESBOURG` | yes | ~20 digits | same call | missing |
| 7 | `GBP_LOCATION_ONGLES_RIVIERES` | yes | ~20 digits | same call | missing |
| 8 | `GBP_ACCOUNT_ONGLES_MAILY` | no | ~21 digits | omit — row 4 covers it | — |
| 9 | `GBP_ACCOUNT_ONGLES_CHARLESBOURG` | **yes (Option A)** | ~21 digits | Charlesbourg's account id | missing |
| 10 | `GBP_ACCOUNT_ONGLES_RIVIERES` | **yes (Option A)** | ~21 digits | Rivières' account id | missing |

Notes:
- Only rows **2 and 3** are truly sensitive. Rest are identifiers (repo is PUBLIC).
- **Store BARE DIGITS** for rows 4–10. APIs return `accounts/123…` / `locations/456…`;
  `fetch-google-reviews.mjs:87` adds the prefix itself → keeping it = doubled path → 404.
- Move OAuth consent screen to **"In production"** BEFORE minting row 3. Testing-mode refresh
  tokens expire after **7 days** → weekly cron would fetch once then fail silently forever.
- Mint row 3 (refresh token) **AFTER** v4 approval — a token minted early may expire before
  approval lands, and hits `403` on reviews meanwhile.

## Step-by-step

- [ ] **0. Decide account strategy** (Option A vs B above). Invite fetcher identity as Manager
      on Charlesbourg + Rivières listings if Option A.
- [ ] **1. Cloud project** — create/pick one. Enable **My Business Account Management API**
      (`mybusinessaccountmanagement.googleapis.com`) + **Business Information API**
      (`mybusinessbusinessinformation.googleapis.com`). Both publicly enablable today.
- [ ] **2. Request v4 access** — submit Business Profile API access request form for that project.
      Wait for approval (long pole).
- [ ] **3. OAuth client** — Credentials → OAuth client ID → **Desktop app**. → rows 1, 2.
      Set consent screen to **In production**.
- [ ] **4. Mint refresh token** — consent flow, scope `business.manage`, `access_type=offline`,
      `prompt=consent`. → row 3. **Do this after step 2 approval.**
- [ ] **5. Discover IDs** — `accounts.list` → row 4 (+ rows 9,10 under Option A);
      `accounts/{id}/locations` → rows 5,6,7. Verify `6940314991` and `12380912253303086145` here.
- [ ] **6. Set secrets** — in your own terminal (NOT via Claude — transcripts leak, see the
      Supabase key-rotation incident):
      ```bash
      cd ~/Repo/ongles-website
      gh auth switch --user theduy3
      for s in GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET GOOGLE_OAUTH_REFRESH_TOKEN \
               GOOGLE_BUSINESS_ACCOUNT_ID GBP_LOCATION_ONGLES_MAILY \
               GBP_LOCATION_ONGLES_CHARLESBOURG GBP_LOCATION_ONGLES_RIVIERES \
               GBP_ACCOUNT_ONGLES_CHARLESBOURG GBP_ACCOUNT_ONGLES_RIVIERES; do
        gh secret set "$s" --repo theduy3/ongles-website
      done
      ```
      (`gh secret set` with no `--body` prompts on the terminal — never enters shell history.)
- [ ] **7. Fire it** — `gh workflow run "Fetch Google reviews"` instead of waiting for Monday.
      Then check `gh run list` is green AND the log has NO `skipping` warnings.

## Side effects to expect

- Fetch **overwrites the hand-entered aggregates**. Current committed values that will change:
  Rivières `4.8/1012`, Maily `3.9/300`, Charlesbourg `4.0/250` → whatever Google actually reports.
  On-page ratings may visibly shift.
- Repo is **PUBLIC** → real reviewer names (shortened to "Marie-Ève L." by `shortenName`) get
  committed to public git history.

## Why this is safe to enable partially

`run_one` (`fetch-reviews.yml:80-85`) skips (doesn't fail) any tenant whose location secret is
unset. BUT: once a location IS set, the script needs the OAuth triple or the job goes red under
`set -euo pipefail`. → **Set all 7 required at once, or none.** Don't set locations piecemeal.

## Key file references

- `.github/workflows/fetch-reviews.yml` — the workflow, secret list in header comment.
- `scripts/fetch-google-reviews.mjs` — zero-dep fetch; `:87` v4 reviews URL; `:44-50` `required()`.
- `src/config/review-honesty.ts` — the two honesty gates:
  - `shouldPublishRating` needs `fetchedAt !== null` + `reviewCount >= 5` (ALREADY passes).
  - `shouldPublishReviewNodes` needs `reviews.length > 0` (still false → Review nodes dark).
- `src/config/tenants/*/google-reviews.json` — fetch targets (currently `reviews: []`).
