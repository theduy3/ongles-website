# Phase 1 — Per-Tenant Data Request Checklist

**Purpose:** You (the owner) fill this offline. Execution consumes it to complete `src/config/tenants/{id}/`. Per D-01, Claude fills nothing here without your value.

**Legend:**
- 🔴 **FILL** — required-core, currently a placeholder/guess/approx. Must be real to pass Phase 1.
- 🟡 **CONFIRM** — already populated and looks real; confirm it's correct (or correct it).
- 🔵 **IF-EXISTS** — Maps CID; fill only if a Google Business Profile exists, else mark "no GBP yet" (deferred-OK, D-07).
- ⚪ **OPTIONAL** — deferred-OK with safe fallback (D-08).

**Reference tenant (already complete):** `ongles-maily` — match its field coverage.

---

## ongles-charlesbourg  (https://www.onglescharlesbourg.com)

### Brand / booking (`site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 1 | SalonX `storeId` (widget store code) | `"OC"` (placeholder) | 🔴 FILL | |
| 2 | `widgetHost` | `https://app.onglesmaily.com` | 🟡 CONFIRM (shared host OK?) | |
| 3 | `booker.giftCertificate` URL | = booking URL (placeholder; Square link?) | ⚪ OPTIONAL | |
| 4 | Google Maps CID / GBP `@id` (`socialProfiles`/sameAs) | empty `[]` | 🔵 IF-EXISTS | |
| 5 | `contact.email` | `info@onglescharlesbourg.com` (guessed pattern) | 🔴 FILL (confirm real) | |

### Location facts (`location.ts` + `site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 6 | Name | `Ongles Charlesbourg` / loc `Carrefour Charlesbourg` | 🟡 CONFIRM | |
| 7 | Address line1 | `8500 boulevard Henri-Bourassa` | 🟡 CONFIRM | |
| 8 | City / region / postal | `Québec, QC G1G 5X1` | 🟡 CONFIRM | |
| 9 | Phone | `(581) 981-8228` | 🟡 CONFIRM | |
| 10 | Hours (Lun–Mer / Jeu–Ven / Sam / Dim) | `9–17:30 / 9–20 / 9–17 / 10–17` | 🟡 CONFIRM | |
| 11 | **Geo coords (lat/lng)** | `46.8629, -71.279` (**approx**) | 🔴 FILL (exact) | |

### Pricing (`services.ts`) — distinct per tenant (D-04). Same 4-service catalog (D-05).
| # | Service | Current (mirrors maily) | Status | Your price / priceTo |
|---|---------|--------------------------|--------|----------------------|
| 12 | pose-ongles (pose d'ongles) | 60–75 | 🔴 FILL | |
| 13 | remplissage (fill) | 45–60 | 🔴 FILL | |
| 14 | soins-mains (manicure) | 30–40 | 🔴 FILL | |
| 15 | soins-pieds (pedicure) | 35–60 | 🔴 FILL | |

---

## ongles-rivieres  (https://www.onglesrivieres.com)

### Brand / booking (`site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 1 | SalonX `storeId` (widget store code) | `"OR"` (placeholder) | 🔴 FILL | |
| 2 | `widgetHost` | `https://app.onglesmaily.com` | 🟡 CONFIRM (shared host OK?) | |
| 3 | `booker.giftCertificate` URL | = booking URL (placeholder) | ⚪ OPTIONAL | |
| 4 | Google Maps CID / GBP `@id` (`socialProfiles`/sameAs) | empty `[]` | 🔵 IF-EXISTS | |
| 5 | `contact.email` | `info@onglesrivieres.com` (guessed pattern) | 🔴 FILL (confirm real) | |

### Location facts (`location.ts` + `site.ts`)
| # | Field | Current value | Status | Your value |
|---|-------|---------------|--------|------------|
| 6 | Name | `Ongles Rivières` / loc `Centre Les Rivières` | 🟡 CONFIRM | |
| 7 | Address line1 | `4225 boulevard des Forges` | 🟡 CONFIRM | |
| 8 | City / region / postal | `Trois-Rivières, QC G8Y 1W2` | 🟡 CONFIRM | |
| 9 | Phone | `(819) 378-8228` | 🟡 CONFIRM | |
| 10 | Hours (Lun–Mer / Jeu–Ven / Sam / Dim) | `9:30–17:30 / 9–21 / 9–17 / 10–17` | 🟡 CONFIRM | |
| 11 | **Geo coords (lat/lng)** | `46.359, -72.573` (**approx**) | 🔴 FILL (exact) | |

### Pricing (`services.ts`) — distinct per tenant (D-04). Same 4-service catalog (D-05).
| # | Service | Current (mirrors maily) | Status | Your price / priceTo |
|---|---------|--------------------------|--------|----------------------|
| 12 | pose-ongles (pose d'ongles) | 60–75 | 🔴 FILL | |
| 13 | remplissage (fill) | 45–60 | 🔴 FILL | |
| 14 | soins-mains (manicure) | 30–40 | 🔴 FILL | |
| 15 | soins-pieds (pedicure) | 35–60 | 🔴 FILL | |

---

## How to get exact geo coords
Open Google Maps → drop a pin on the salon entrance → right-click → the lat/lng appears at top of the menu (copyable).

## How to get the Maps CID (if GBP exists)
Search the business on Google Maps → share/embed, or use the GBP "place ID" → CID. If no profile exists yet, write **"no GBP yet"** — Phase 1 won't block (D-07); schema omits the linkage cleanly.

---
*Checklist generated: 2026-06-17 — feeds Phase 1 execution.*
