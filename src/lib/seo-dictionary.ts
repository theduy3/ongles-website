import type en from "@/config/seo/seo.en.json";

// Canonical SEO shape, derived from the English base SEO JSON. Mirrors the
// Dictionary type (src/lib/dictionary.ts) but holds ONLY SEO-facing text:
// page meta, per-service meta + schema/alt, org description, gallery alt.
// Lives outside the `server-only` seo-content module so client components can
// import the type. fr ⇔ en key parity is a hard rule — see AGENTS.md.
export type SeoDictionary = typeof en;
