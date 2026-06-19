# Phase 04 — UAT Verification Guide

Auto-generated from plan checkpoints. Updated as each wave completes.

---

## Plan 04-03: Borough Near-Me Landings

**Verification scope:** 3 borough-targeted SEO landing pages (Beauport / Charlesbourg / Trois-Rivières), uniqueness of copy, nav exclusion, NAP/hours panel.

### Prerequisites

```bash
# In main repo (not worktree — bun run dev is not restricted)
cd /Users/theduy/Repo/ongles-website
```

### Verification steps

#### Step 1 — Ongles Maily → /beauport

```bash
TENANT=ongles-maily bun run dev
```

Visit: http://localhost:3000/fr/beauport

Expected:
- `<h1>` names **Beauport** (not generic "Québec")
- Opening paragraph is ≥150 words, mentions Carrefour Beauport, rue du Carrefour, Félix-Leclerc expressway, Giffard/Montmorency neighbourhoods
- NAP/landmark panel below (address: Carrefour Beauport, phone, hours by day)
- Book CTA + Call CTA + link to /locations
- **Not** present in header navigation

Visit: http://localhost:3000/en/beauport

Expected:
- Idiomatic English version, same Carrefour Beauport facts
- 164-word unique EN opener

#### Step 2 — Ongles Charlesbourg → /charlesbourg

```bash
TENANT=ongles-charlesbourg bun run dev
```

Visit: http://localhost:3000/fr/charlesbourg

Expected:
- `<h1>` names **Charlesbourg** (not Beauport or generic Québec)
- Copy mentions Henri-Bourassa corridor, Carrefour Charlesbourg, Laurentides/Trait-Carré, Val-Bélair, Lac-Saint-Charles — clearly different landmarks from Beauport
- NAP shows 8500 boulevard Henri-Bourassa, Québec, QC G1G 5X1
- Guard-verified: Jaccard overlap with Beauport FR copy is 0.000

Visit: http://localhost:3000/en/charlesbourg

Expected: EN version, 162 words, Henri-Bourassa corridor framing

#### Step 3 — Ongles Rivières → /trois-rivieres

```bash
TENANT=ongles-rivieres bun run dev
```

Visit: http://localhost:3000/fr/trois-rivieres

Expected:
- `<h1>` names **Trois-Rivières**
- Copy mentions Centre Les Rivières, boulevard des Forges, Vieux-Trois-Rivières, Cap-de-la-Madeleine, Mauricie region — entirely different city from both Québec tenants
- NAP shows 4225 boulevard des Forges, Trois-Rivières, QC G8Y 1W2
- Phone: (819) 378-8228

Visit: http://localhost:3000/en/trois-rivieres

Expected: EN version, 159 words

#### Step 4 — Nav exclusion (all tenants)

Check header nav on all 3 tenants: none of /beauport, /charlesbourg, /trois-rivieres should appear as a nav link. These routes are sitemap/contextual only.

### Guard verification (automated — already passing)

```bash
bun test src/config/schema-invariants.test.ts
```

Key tests live after 04-03:
- `04-03: checkWordCount — nearMe guard bites on short/empty copy` — fires below 150 words
- `04-03: checkCrossTenantOverlap — identical-copy fail-fixture` — Jaccard=1.0 on identical text
- `04-03: validateSchemaInvariants — zero nearMe errors after wiring + copy` — full integration green

### Resume signal

After visual inspection, reply:
- `"approved"` — all 3 boroughs look correct, copy is unique, nav is clean
- Or describe any issues: city-not-borough h1, copy too similar between Beauport/Charlesbourg, near-me leaked into header
