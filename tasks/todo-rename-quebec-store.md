<!-- s1 metadata
task-name: rename-quebec-store
scope: small
status: done
repo: /Users/theduy/Repo/maily-website
created-at: 2026-05-24
-->

# Rename coming-soon store → bilingual "New Store in Quebec City"

**Goal:** Rename the 4th (coming-soon) salon card from "Ongles & Spa Québec" to a bilingual name — EN "New Store in Quebec City", FR "Nouveau salon à Québec".

**Architecture:** `brand` is typed locale-invariant. Add optional `brandByLocale?: { fr; en }` for descriptive/placeholder entries; `buildSalonCards` (already has `lang`) resolves it with `brand` as fallback. Proper-noun sisters (Charlesbourg, Rivières) unaffected.

**Tech Stack:** TS, i18n dictionary pattern.

---

### Task 1: Add per-locale name + wire render

**Files:**
- Modify: `src/lib/salons.ts` (type ~line 21, quebec entry ~line 84-88)
- Modify: `src/components/SalonCard.tsx` (sisters map ~line 174-189)

- [ ] **salons.ts — add optional field to `SisterSalon` type** (after `comingSoon?: boolean;`)

```ts
  // Optional per-locale display name for descriptive/placeholder entries that
  // aren't locale-invariant proper nouns. Falls back to `brand` when absent.
  brandByLocale?: { fr: string; en: string };
```

- [ ] **salons.ts — update the quebec entry**

```ts
  {
    id: "quebec",
    brand: "New Store in Quebec City",
    brandByLocale: { en: "New Store in Quebec City", fr: "Nouveau salon à Québec" },
    comingSoon: true,
  },
```

- [ ] **SalonCard.tsx — resolve localized name in the sisters map.** Convert arrow to block body; replace `name: s.brand` → `name,` and `mapTitle: s.brand` → `mapTitle: name`:

```ts
  const sisters: SalonCardProps[] = sisterSalons.map((s) => {
    const name = s.brandByLocale?.[lang] ?? s.brand;
    return {
      name,
      nameHref: s.website,
      external: true,
      landmark: s.landmark,
      mapSrc: s.address ? mapEmbedSrc(s.address.query) : undefined,
      mapTitle: name,
      address: s.address
        ? { line1: s.address.line1, line2: s.address.line2 }
        : undefined,
      hours: s.hours?.[lang],
      phone: s.phone,
      phoneHref: s.phoneHref,
      bookHref: s.booking,
      bookLabel: l.bookNow,
      comingSoon: s.comingSoon,
      comingSoonLabel: l.comingSoon,
      labels,
    };
  });
```

- [ ] **Verify:** `bun run build` clean.
- [ ] **Visual:** `/en` card 4 = "New Store in Quebec City"; `/fr` = "Nouveau salon à Québec".
- [ ] **Commit.**
