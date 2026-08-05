# Design: Move the Homepage Direct-Answer Block Below the Hero

**Date:** 2026-08-05  
**Status:** Approved
**Scope:** Ongles Maily homepage, French and English locales

## Context

The homepage currently renders the shared `AnswerBlock` before the visual hero. It
uses a compact sand band, contains the homepage's only H1, and displays the
tenant-configured direct-answer paragraph. The hero follows it with the primary
image, booking/call actions, price anchor, review signal, and trust badges.

The direct-answer content is valuable for SEO and GEO because it is visible,
server-rendered, self-contained, and specific about the business, location,
services, hygiene, and walk-in policy. The design issue is its position: the sand
band appears before the visual experience the owner wants clients to see first.

The same `AnswerBlock` is also used by service, pricing, comparison, location,
and near-me pages. Those pages should retain their current answer-first behavior.
The homepage change must therefore be explicit and localized to the homepage.

## Goals

- Make the existing visual hero the first visible homepage section on mobile and
  desktop, in both French and English.
- Keep the audited factual paragraph visible, accessible, server-rendered, and
  early in the document for search and answer-engine extraction.
- Preserve one logical H1 and a valid heading hierarchy.
- Preserve the existing copy in the tenant SEO configuration and its locale
  parity.
- Avoid changing metadata, JSON-LD, URL structure, navigation, service cards,
  hero styling, CTAs, or other routes.

## Non-goals

- Do not hide the answer with `display: none`, off-screen positioning,
  `aria-hidden`, or a metadata-only copy.
- Do not add a second paragraph, new schema type, FAQ item, card, icon, image, or
  CTA for this change.
- Do not redesign the hero or replace the current compact sand treatment.
- Do not change the direct-answer copy unless a later content review identifies a
  separate factual or translation issue.

## Approved design

The homepage content order becomes:

1. Hero section, visually unchanged, with its main title rendered as the single
   page H1.
2. Compact homepage answer section, using the existing sand treatment, with the
   current location-focused heading rendered as an H2 and the current factual
   paragraph below it.
3. Existing services section, including its current anchor, cards, imagery, and
   booking buttons.
4. All remaining homepage sections in their current order.

The hero's title element changes from H2 to H1, but it keeps the same classes and
text. This is a semantic change only and must not change its visual appearance.
The answer section keeps the existing compact spacing, colors, max-width, and
typography. Moving it below the hero is the primary visual change.

## Component and data design

Extend `src/components/AnswerBlock.tsx` with an optional heading-level prop that
supports H1 and H2. H1 remains the default so every existing inner-page caller
continues to behave exactly as before. The prop should affect only the heading
element; the existing compact and non-compact style variants remain available.

Update `src/app/[lang]/page.tsx` as follows:

- Remove the homepage `AnswerBlock` from the fragment before the hero.
- Change the hero's title element from H2 to H1 without changing its classes or
  text.
- Render the same homepage `AnswerBlock` immediately after the hero with
  `compact` enabled and the new H2 setting.
- Leave all other `AnswerBlock` callers unchanged.

The homepage heading and paragraph continue to come from
`seo.meta.homeAnswerHeading` and `seo.meta.homeAnswerBlock`. The French and
English values remain in the tenant SEO files, so no JSX copy duplication is
introduced and the existing SEO parity guard remains authoritative.

Update component comments and homepage comments to describe the new role and
position. They must no longer claim that the homepage answer block is first in
the DOM or that it always carries the page H1.

## SEO and GEO behavior

The page still exposes a visible, crawlable, self-contained local-business
answer near the top of the main content. It follows the hero so the first visual
impression is conversion-oriented, while the heading and paragraph remain early
enough to provide clear topical context.

The hero H1 is the main marketing promise. The answer H2 supplies the explicit
local entity phrase, and the paragraph supplies the location, service, hygiene,
and booking facts. Existing title tags, meta descriptions, canonicals,
hreflang, JSON-LD, sitemap, and `llms.txt` behavior are not changed.

## Verification plan

Add a targeted homepage browser assertion covering both locales:

- The page has exactly one H1 and it is visible in the hero.
- The homepage answer heading is an H2 and its localized paragraph is present.
- The answer section occurs after the hero and before the services section.

Run the existing checks:

- `bun test src/`
- `bun run lint`
- `bun run build`
- Relevant homepage and SEO Playwright tests, including canonical,
  hreflang, structured-data, and service-section coverage.

Perform a responsive visual check at the existing mobile and desktop audit
widths. Confirm that the hero remains the first visual section, the compact sand
band does not create horizontal overflow or unexpected layout shift, and the
service section begins in its existing visual pattern.

## Acceptance criteria

- The first visible homepage section is the existing hero in FR and EN at mobile
  and desktop widths.
- The homepage has exactly one H1, located in the hero.
- The audited homepage answer remains visible and appears immediately after the
  hero as an H2 section before services.
- All inner-page `AnswerBlock` usages retain their existing H1 behavior.
- French and English SEO structures remain in parity.
- No metadata, schema, URL, CTA, image, or service-card regression is introduced.
- Tests, lint, and production build pass.
