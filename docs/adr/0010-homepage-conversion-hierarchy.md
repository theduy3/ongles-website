# ADR 0010 - homepage conversion hierarchy and mobile hero

- **Status:** Accepted
- **Date:** 2026-08-05
- **Context module:** Presentation (see `CONTEXT.md`)

## Context

The homepage already has a working tenant-driven content model, localized routes,
brand photography, and a clear set of alternatives: online booking, phone calls,
and walk-ins. The desktop render communicates the brand well, but the mobile hero
puts the primary image and the next section below a long sequence of copy, buttons,
trust metrics, and floating actions.

The redesign must preserve the existing brand, routes, copy ownership, and tenant
content while making the first mobile interaction easier to understand. A stronger
visual overhaul would add risk without solving a content hierarchy problem.

## Decision

Keep the current visual identity and page information architecture. Treat online
booking as the primary homepage conversion, with phone and walk-in access as
secondary paths.

- The desktop hero remains a split composition with copy first and a real nail image
  alongside it.
- The mobile hero keeps the headline first, reduces vertical spacing, and places the
  image shortly after the first action block.
- The service catalog uses an asymmetric lead card and supporting choices instead of
  four equal cards.
- Hygiene and trust content uses real photography and scan-friendly editorial rows.
- Existing localized content remains the source of truth. Homepage-visible copy is
  kept free of decorative dash separators so it reads cleanly at narrow widths.
- Motion remains restrained and honors reduced-motion preferences.

## Rationale

Online booking is the most direct, measurable next step for a visitor who already
knows they want a service. Phone and walk-in paths still matter for local clients,
first-time visitors, and schedule uncertainty, so they remain accessible without
competing with the primary action.

Keeping the headline first on mobile preserves the brand's existing verbal promise
and keeps the first action near the top. Moving the image immediately after that
moment restores the visual proof without making the user scroll through secondary
metrics first.

## Consequences

- Homepage CTA styling and placement should continue to use the tenant booking path
  rather than hardcoded URLs.
- Future homepage experiments should measure booking clicks separately from phone
  clicks and location interactions.
- New tenants inherit the same conversion hierarchy but can still supply their own
  localized copy and imagery through the existing configuration seams.
- The homepage uses one new supporting image asset for the hygiene section; the
  existing hero and gallery images remain unchanged.
