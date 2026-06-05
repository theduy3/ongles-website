<!-- s1 metadata
task-name: hero-subtitle-locations
scope: small
status: done
repo: /Users/theduy/Repo/maily-website
created-at: 2026-05-24
-->

# Hero Subtitle: disinfection stations → 4 locations

**Goal:** Reword the hero `description` so it says "across 4 locations" instead of "three disinfection stations", matching the hero "4 Locations" stat.

**Scope:** 2 string values, 2 files. Other 12 disinfection-station refs (hygiene copy) left untouched.

**Decisions:** count = 4 (matches stat en.json:66-67). Clean rewrite (literal swap broke the sentence).

---

### Task 1: Update hero description (EN + FR)

**Files:**
- Modify: `src/dictionaries/en.json:58`
- Modify: `src/dictionaries/fr.json:58`

- [ ] EN line 58 → `"description": "Expert nail services in a warm, family atmosphere across 4 locations. Hygiene-first, with 15+ years of experience.",`
- [ ] FR line 58 → `"description": "Services d'ongles experts dans une ambiance chaleureuse et familiale, dans 4 salons. Hygiène irréprochable et plus de 15 ans d'expérience.",`
- [ ] Verify JSON valid: `node -e "require('./src/dictionaries/en.json');require('./src/dictionaries/fr.json');console.log('ok')"`
- [ ] Visual: reload `/en` + `/fr`, confirm hero subtitle reads naturally
- [ ] Commit
