# Phase 05 — Manual UAT Checklist (llms.txt depth · measurement · conversion)

> Automated tests + production build are green (see 05-05-SUMMARY). This checklist
> covers what only a human can verify in a real browser / GA4 account. Run against
> each tenant host after deploy. Check items off as confirmed.

## Pre-req
- [x] Owner has created GA4 properties (one per tenant) and pasted each `G-XXXXXXXXXX`
      into `src/config/tenants/<id>/site.ts` → `ga4MeasurementId`. ✅ all 3 IDs live & loading correct script per host (2026-06-27).
      _(Until then, GA4 sections below are expected to show "no GA4 script" — that is OK; the build still passes with empty IDs.)_

## MEAS-01/02 — GA4 + Consent Mode v2 (per tenant, once an ID is set)
> Verified 2026-06-27 on all 3 live hosts (Maily G-TCB8TWD8S1, Charlesbourg G-3BWLPQXH7L,
> Rivières G-53RP9F6NS2) via browser automation. **Method note:** server-side GA4 DebugView
> was not used (no owner Google login). Equivalent client-side proxy used instead — `_ga`
> cookie presence (written locally by gtag.js), `dataLayer` consent default/update, and
> `/g/collect` beacons with `gcs=` consent flag. AdGuard in the test browser returned a fake
> 503 on the GA4 beacon *transport* (`sendBeacon`); the identical URL via `fetch` returned
> 204, so real users transmit fine — beacon firing + params were verified regardless.
- [x] First visit shows the ConsentBanner; analytics_storage is **denied** by default (no `_ga` before accept; `consent default` = analytics+ad denied, `wait_for_update:500`). ✅ all 3
- [x] Click **Accept** → `_ga` + `_ga_<ID>` cookies appear; granted beacon fires (`gcs` flips G100→G101). _(DebugView session not checked — client proxy instead.)_ ✅ all 3
- [x] Click **Decline** (fresh profile) → no `_ga`, `localStorage=declined`, no granted consent update, only `gcs=G100` denied pings. ✅ all 3
- [x] Web Vitals: after consent, vitals fire to GA4 with `gcs=G101` (TTFB observed live with value+rating; LCP/INP/CLS share the same `WebVitalsReporter` path, fire on page-hide/interaction). ✅
- [x] Choice persists across reloads (localStorage `ga4_consent`; no banner on revisit, consent update re-fires). ✅ all 3

## CONV-01 — Conversion events (after consent)
> Verified 2026-06-27, all 3 tenants. Events captured via `window.gtag` wrapper + `/g/collect`
> beacons with correct `en=`/`ep.*` params and per-tenant `salon_location`.
- [x] `book_online_click` fires when the floating "Book" CTA is clicked (`event_category: conversion`). ✅ all 3
- [x] `call_click` fires on the floating phone CTA (per-tenant phone). ✅ all 3
- [x] `contact_form_submit` fires on a successful contact-form submit. _(Verified on success path with `/api/contact` stubbed to `{success:true}` — no real inquiry email sent.)_ ✅ all 3
- [x] `directions_click` fires on a salon-card directions link. ✅ all 3

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
