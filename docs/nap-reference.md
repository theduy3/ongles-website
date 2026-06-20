# Canonical NAP Reference (N-02)

> Single source of truth for each tenant's **N**ame / **A**ddress / **P**hone, for
> aligning external Google Business Profiles, directories, and citations with the
> site config. Values here are the canonical strings in `src/config/tenants/<id>/site.ts`
> and `location.ts`; the `checkNapConsistency` build guard fails the build if `site.ts`
> and `location.ts` drift apart. Update this doc whenever a tenant's NAP changes.

_Last verified against config: phase 05-05._

## Ongles Maily

| Field | Value |
|-------|-------|
| Name | Ongles Maily |
| Street | 3333 Rue du Carrefour |
| City / Region / Postal | Québec, QC G1C 5R9 |
| Country | CA |
| Phone | (418) 660-8228 |
| Landmark | Carrefour Beauport — Entrées 4 ou 5 |
| Canonical URL | https://onglesmaily.com |
| GA4 property | _none yet_ |

**Hours:** Mon–Wed 09:00–17:30 · Thu–Fri 09:00–21:00 · Sat 09:00–17:00 · Sun 10:00–17:00

## Ongles Charlesbourg

| Field | Value |
|-------|-------|
| Name | Ongles Charlesbourg |
| Street | 8500 boulevard Henri-Bourassa |
| City / Region / Postal | Québec, QC G1G 5X1 |
| Country | CA |
| Phone | (581) 981-8228 |
| Landmark | Carrefour Charlesbourg — Entrées 5 |
| Canonical URL | https://www.onglescharlesbourg.com |
| GA4 property | _none yet_ |

**Hours:** Mon–Wed 09:00–17:30 · Thu–Fri 09:00–20:00 · Sat 09:00–17:00 · Sun 10:00–17:00

## Ongles Rivières

| Field | Value |
|-------|-------|
| Name | Ongles Rivières |
| Street | 4225 boulevard des Forges |
| City / Region / Postal | Trois-Rivières, QC G8Y 1W2 |
| Country | CA |
| Phone | (819) 378-8228 |
| Landmark | Centre Les Rivières |
| Canonical URL | https://www.onglesrivieres.com |
| GA4 property | _none yet_ |

**Hours:** Mon–Wed 09:30–17:30 · Thu–Fri 09:00–21:00 · Sat 09:00–17:00 · Sun 10:00–17:00

---

### Why NAP consistency matters

Local search ranking and AI-assistant citations weight NAP consistency across the
web. The same Name/Address/Phone must appear identically on the website, the Google
Business Profile, and every directory listing. When updating any tenant's NAP:

1. Edit `src/config/tenants/<id>/site.ts` and `location.ts` together (the
   `checkNapConsistency` guard blocks the build if they disagree).
2. Update this reference doc.
3. Update the external Google Business Profile + directory listings to match.
