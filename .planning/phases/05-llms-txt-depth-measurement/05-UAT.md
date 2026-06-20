# Phase 05 — Manual UAT Checklist (llms.txt depth · measurement · conversion)

> Automated tests + production build are green (see 05-05-SUMMARY). This checklist
> covers what only a human can verify in a real browser / GA4 account. Run against
> each tenant host after deploy. Check items off as confirmed.

## Pre-req
- [ ] Owner has created GA4 properties (one per tenant) and pasted each `G-XXXXXXXXXX`
      into `src/config/tenants/<id>/site.ts` → `ga4MeasurementId`.
      _(Until then, GA4 sections below are expected to show "no GA4 script" — that is OK; the build still passes with empty IDs.)_

## MEAS-01/02 — GA4 + Consent Mode v2 (per tenant, once an ID is set)
- [ ] First visit shows the ConsentBanner; analytics_storage is **denied** by default (DevTools → Application → Cookies: no `_ga` before accept).
- [ ] Click **Accept** → `_ga` cookie appears; GA4 DebugView shows the session.
- [ ] Click **Decline** (fresh profile) → no `_ga`, no pageview in DebugView.
- [ ] Web Vitals: after consent, GA4 DebugView receives `LCP`, `INP`, `CLS` events.
- [ ] Choice persists across reloads (localStorage `ga4_consent`).

## CONV-01 — Conversion events (GA4 DebugView, after consent)
- [ ] `book_online_click` fires when the floating "Book" CTA is clicked.
- [ ] `call_click` fires on the floating phone CTA.
- [ ] `contact_form_submit` fires on a successful contact-form submit.
- [ ] `directions_click` fires on a salon-card directions link.

## CONV-02 — Above-fold trust signals
- [ ] Home hero shows a "from $30" price anchor linking to the localized pricing route (`/tarifs` FR, `/pricing` EN).
- [ ] Service-detail hero shows the price-from anchor → pricing route.
- [ ] No star rating renders while `reviewCount = 0` (all tenants currently 0 — expect NO stars). Re-verify once real Google reviews land.

## LLMS-01/02 — llms.txt (per tenant host: `/<host>/llms.txt`)
- [ ] Body is ≥200 words and reads as that tenant's own salon (its landmark/city).
- [ ] **No cross-tenant leak:** charlesbourg/rivieres pages contain NO "Carrefour Beauport"; maily/rivieres contain NO "Carrefour Charlesbourg"; maily/charlesbourg contain NO "Trois-Rivières" / "Centre Les Rivières".
- [ ] FR content leads; EN equivalents follow.
- [ ] Links resolve to this tenant's `canonicalUrl` host (incl. Phase-4 comparison / pricing / borough pages).

## LOCAL-01 — NAP alignment
- [ ] `docs/nap-reference.md` matches each live site footer + contact page.
- [ ] (When GBP exists) external Google Business Profile NAP matches the reference exactly.

## Sign-off
- [ ] All boxes above checked, or remaining items logged as follow-ups.
- Verified by: __________  Date: __________
