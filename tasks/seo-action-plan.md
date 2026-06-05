# Ongles Maily — SEO Action Plan

Prioritized from the 2026-05-22 audit (score 80/100). Companion: `seo-audit-report.md`.

---

## 🔴 Critical — none

No indexing blockers or penalty risks. Site is fundamentally healthy.

---

## ✅ Done (2026-05-22)

- **Images optimized:** hero + 4 home PNGs (11 MB) → WebP (416 KB, −96%). Old PNGs deleted, refs updated.
- **og:image:** dedicated 382 KB JPEG (`/images/og.jpg`) — universal scraper compat — replaces the 2.5 MB PNG; feeds og/twitter/schema.
- **`X-Powered-By`** header suppressed (`poweredByHeader: false`).
- **`llms.txt`** added via route handler (`src/app/llms.txt/route.ts`) — generated from `site` config.
- **Interior titles** rewritten with location/service keywords (FR + EN, parity kept).
- **Home meta descriptions** trimmed (FR 215→163, EN 181→151 chars).
- **CLS "fix" cancelled** — was a false positive; all images already use `next/image` with reserved space.

---

## 🟠 High — fix within 1 week

### 1. ~~Optimize hero image~~ ✅ DONE — see above. Remaining: hero render already passes `priority` + `sizes`. Optional later: a purpose-shot 1200×630 landscape og banner (current og is the portrait hero, correctly sized weight-wise but portrait).

### 2. ~~Deepen thin pages~~ ✅ DONE (2026-05-23)
- `/about` 233→336 words: craft/experience + services-range + no-deposit/walk-in paragraphs.
- `/locations` 174→284: new "Venir nous voir" block (getting here / walk-in / what to expect).
- `/services` 224→305: lead paragraph + closing hygiene-promise + CTA band.
- `/book-online` 138→227: "Comment réserver" 3-step section + no-deposit note.
- FR canonical + EN mirror, dict key parity intact (253 keys).
- ✅ **Hybrid facts filled (2026-05-24):**
  - `/about`: heritage paragraph — family business founded 2007, passion for craft + people (no owner name given; used "we/family").
  - `/locations`: 1,500+ free parking spaces, fully accessible, RTC transit (Terminus Beauport nearby).
  - `/book-online`: friendly policy adopted — no deposit, 24h cancel notice, 15-min late grace, arrive 5-10 min early (penalties from Sans Souci T&C intentionally dropped to match brand).
  - **Optional still:** owner's name/bio for a stronger E-E-A-T author signal; confirm exact RTC route numbers.

---

## 🟡 Medium — fix within 1 month

### 4. ~~Rewrite interior `<title>` tags~~ ✅ DONE (FR + EN, keyword + Beauport/Québec).

### 5. Populate `sameAs` in LocalBusiness schema **(blocked — needs business input)**
- `src/lib/site.ts` `socialProfiles: []` — already wired into schema; just empty. site.ts notes no active profiles exist.
- **Action for owner:** provide Google Business Profile, Facebook, Instagram URLs → drop into `socialProfiles`.
- **Why:** entity disambiguation + trust; biggest remaining schema win.

### 6. ~~Trim home meta description~~ ✅ DONE (FR 163, EN 151 chars).

### 7. Fix floating-button overlap
- Phone (bottom-right) and number badge (bottom-left) overlap body text on `/services` & `/contact`.
- Add bottom padding/safe-area to page content so they don't cover tappable links.

### 8. Surface contact info higher
- On `/contact`, move phone `(418) 660-8228` + address above the fold (walk-in business — the number is the conversion).
- Add a booking/call CTA into the service-detail static fold (not just the floating button).

---

## 🟢 Low — backlog

- ~~`llms.txt`~~ ✅ DONE — served at `/llms.txt` via route handler.
- ~~Suppress `X-Powered-By`~~ ✅ DONE — `poweredByHeader: false`.
- **Head-level hreflang** — verify `alternates.languages` (`src/lib/seo.ts:84`) emits `<link rel="alternate" hreflang>` in `<head>`; sitemap already covers it, so optional.
- **Author/expertise signals** — add a short technician/owner bio block (E-E-A-T).
- **Reviews** — once real reviews land, wire `aggregateRating` (correctly deferred until then).

---

## Verification checklist (after fixes)

- [ ] `next build && next start`, then re-measure CWV (Lighthouse / PageSpeed) — confirm LCP < 2.5 s, CLS < 0.1.
- [ ] hero served < 300 KB; og:image is 1200×630.
- [ ] All `<img>` have dimensions; no layout shift on slow-3G throttle.
- [ ] Interior titles updated FR + EN; home description ≤ 155 chars.
- [ ] `sameAs` populated; re-validate schema in Google Rich Results Test.
- [ ] Thin pages ≥ 350 words, FR/EN key parity intact.
