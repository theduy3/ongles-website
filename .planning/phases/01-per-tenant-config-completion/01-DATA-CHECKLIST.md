# Phase 1 — Per-Tenant Data Request Checklist

**Purpose:** You (the owner) fill this offline. Execution consumes it to complete `src/config/tenants/{id}/`. Per D-01, Claude fills nothing here without your value.

**Legend:**
- 🔴 **FILL** — required-core, currently a placeholder/guess/approx. Must be real to pass Phase 1.
- 🟡 **CONFIRM** — already populated and looks real; confirm it's correct (or correct it).
- 🔵 **IF-EXISTS** — Maps CID; fill only if a Google Business Profile exists, else mark "no GBP yet" (deferred-OK, D-07).
- ⚪ **OPTIONAL** — deferred-OK with safe fallback (D-08).
- ✅ **CONFIRMED** — owner confirmed real/final on 2026-06-17.

**Reference tenant (already complete):** `ongles-maily` — match its field coverage.

> **Owner confirmation — 2026-06-17:** All current values in ongles-charlesbourg and
> ongles-rivieres configs are REAL and FINAL. storeId "OC"/"OR" are the real SalonX store
> codes. contact.email values are real. geo coords are accepted as final. Per-service prices
> intentionally mirror ongles-maily (D-04 satisfied by owner assertion). Both tenants have no
> GBP yet — Maps CID deferred per D-07; socialProfiles must stay `[]`; schema omits sameAs
> linkage cleanly. D-04 "distinct pricing" and "exact geo" flags are satisfied by owner
> assertion — do not re-flag as blockers. giftCertificate URL deferred-OK (D-08).

---

## ongles-charlesbourg  (https://www.onglescharlesbourg.com)

### Brand / booking (`site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 1 | SalonX `storeId` (widget store code) | `"OC"` | ✅ CONFIRMED | `"OC"` — real SalonX store code |
| 2 | `widgetHost` | `https://app.onglesmaily.com` | ✅ CONFIRMED | shared host confirmed OK |
| 3 | `booker.giftCertificate` URL | = booking URL | ⚪ OPTIONAL (deferred-OK, D-08) | no Square link yet — deferred |
| 4 | Google Maps CID / GBP `@id` (`socialProfiles`/sameAs) | empty `[]` | ✅ CONFIRMED | no GBP yet — deferred per D-07 |
| 5 | `contact.email` | `info@onglescharlesbourg.com` | ✅ CONFIRMED | real public email |

### Location facts (`location.ts` + `site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 6 | Name | `Ongles Charlesbourg` / loc `Carrefour Charlesbourg` | ✅ CONFIRMED | as-is |
| 7 | Address line1 | `8500 boulevard Henri-Bourassa` | ✅ CONFIRMED | as-is |
| 8 | City / region / postal | `Québec, QC G1G 5X1` | ✅ CONFIRMED | as-is |
| 9 | Phone | `(581) 981-8228` | ✅ CONFIRMED | as-is |
| 10 | Hours (Lun–Mer / Jeu–Ven / Sam / Dim) | `9–17:30 / 9–20 / 9–17 / 10–17` | ✅ CONFIRMED | as-is |
| 11 | **Geo coords (lat/lng)** | `46.8629, -71.279` | ✅ CONFIRMED | accepted as final |

### Pricing (`services.ts`) — distinct per tenant (D-04). Same 4-service catalog (D-05).
| # | Service | Current (mirrors maily) | Status | Your price / priceTo |
|---|---------|--------------------------|--------|----------------------|
| 12 | pose-ongles (pose d'ongles) | 60–75 | ✅ CONFIRMED | 60–75 (intentional, matches maily) |
| 13 | remplissage (fill) | 45–60 | ✅ CONFIRMED | 45–60 (intentional, matches maily) |
| 14 | soins-mains (manicure) | 30–40 | ✅ CONFIRMED | 30–40 (intentional, matches maily) |
| 15 | soins-pieds (pedicure) | 35–60 | ✅ CONFIRMED | 35–60 (intentional, matches maily) |

---

## ongles-rivieres  (https://www.onglesrivieres.com)

### Brand / booking (`site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 1 | SalonX `storeId` (widget store code) | `"OR"` | ✅ CONFIRMED | `"OR"` — real SalonX store code |
| 2 | `widgetHost` | `https://app.onglesmaily.com` | ✅ CONFIRMED | shared host confirmed OK |
| 3 | `booker.giftCertificate` URL | = booking URL | ⚪ OPTIONAL (deferred-OK, D-08) | no Square link yet — deferred |
| 4 | Google Maps CID / GBP `@id` (`socialProfiles`/sameAs) | empty `[]` | ✅ CONFIRMED | no GBP yet — deferred per D-07 |
| 5 | `contact.email` | `info@onglesrivieres.com` | ✅ CONFIRMED | real public email |

### Location facts (`location.ts` + `site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 6 | Name | `Ongles Rivières` / loc `Centre Les Rivières` | ✅ CONFIRMED | as-is |
| 7 | Address line1 | `4225 boulevard des Forges` | ✅ CONFIRMED | as-is |
| 8 | City / region / postal | `Trois-Rivières, QC G8Y 1W2` | ✅ CONFIRMED | as-is |
| 9 | Phone | `(819) 378-8228` | ✅ CONFIRMED | as-is |
| 10 | Hours (Lun–Mer / Jeu–Ven / Sam / Dim) | `9:30–17:30 / 9–21 / 9–17 / 10–17` | ✅ CONFIRMED | as-is |
| 11 | **Geo coords (lat/lng)** | `46.359, -72.573` | ✅ CONFIRMED | accepted as final |

### Pricing (`services.ts`) — distinct per tenant (D-04). Same 4-service catalog (D-05).
| # | Service | Current (mirrors maily) | Status | Your price / priceTo |
|---|---------|--------------------------|--------|----------------------|
| 12 | pose-ongles (pose d'ongles) | 60–75 | ✅ CONFIRMED | 60–75 (intentional, matches maily) |
| 13 | remplissage (fill) | 45–60 | ✅ CONFIRMED | 45–60 (intentional, matches maily) |
| 14 | soins-mains (manicure) | 30–40 | ✅ CONFIRMED | 30–40 (intentional, matches maily) |
| 15 | soins-pieds (pedicure) | 35–60 | ✅ CONFIRMED | 35–60 (intentional, matches maily) |

---

## How to get exact geo coords
Open Google Maps → drop a pin on the salon entrance → right-click → the lat/lng appears at top of the menu (copyable).

## How to get the Maps CID (if GBP exists)
Search the business on Google Maps → share/embed, or use the GBP "place ID" → CID. If no profile exists yet, write **"no GBP yet"** — Phase 1 won't block (D-07); schema omits the linkage cleanly.

---
*Checklist generated: 2026-06-17 — feeds Phase 1 execution.*
*Owner confirmation recorded: 2026-06-17 — all current values confirmed real/final (see note above).*
