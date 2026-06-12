import { z } from "zod";

// Sparse override schema for store settings stored in Supabase. Every section
// is optional so the admin only needs to persist the fields they've changed —
// the static tenant config covers the rest. Structural keys (nav, routes, id,
// slug) are deliberately excluded and .strict() catches any attempt to sneak
// them in. Unknown top-level keys are also rejected so typos fail loudly.

// ── service ids ──────────────────────────────────────────────────────────────

const ServiceIdSchema = z.enum([
  "pose-ongles",
  "remplissage",
  "soins-mains",
  "soins-pieds",
]);

// ── site section ─────────────────────────────────────────────────────────────
// Only VALUE fields editable at runtime. Structural keys nav and routes are
// intentionally omitted so .strict() rejects them.

const HoursEntrySchema = z
  .object({
    days: z.array(z.string()),
    opens: z.string(),
    closes: z.string(),
  })
  .strict();

const ReviewsSchema = z
  .object({
    ratingValue: z.number().optional(),
    reviewCount: z.number().optional(),
    bestRating: z.number().optional(),
    source: z.string().optional(),
  })
  .strict();

const GeoSchema = z
  .object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .strict();

const AddressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .strict();

const ContactSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    phoneHref: z.string().optional(),
    landmark: z.string().optional(),
    address: AddressSchema.optional(),
  })
  .strict();

const BookerSchema = z
  .object({
    brand: z.string().optional(),
    giftCertificate: z.string().optional(),
  })
  .strict();

const SiteSectionSchema = z
  .object({
    name: z.string().optional(),
    url: z.string().optional(),
    storeId: z.string().optional(),
    // SalonX widget origin (no trailing slash). Lets the admin re-point booking /
    // check-in / queue widgets without a rebuild.
    widgetHost: z.string().optional(),
    // Header logo image URL (Supabase public bucket). Falls back to the static
    // /images/logo.png default when unset. Admin-uploaded via /api/admin/upload.
    logo: z.string().optional(),
    booking: z.string().optional(),
    booker: BookerSchema.optional(),
    priceRange: z.string().optional(),
    socialProfiles: z.array(z.string()).optional(),
    reviews: ReviewsSchema.optional(),
    geo: GeoSchema.optional(),
    // Whole hours array replaces (consistent with deepMerge array semantics).
    hours: z.array(HoursEntrySchema).optional(),
    contact: ContactSchema.optional(),
    // nav and routes are structural — omitted so .strict() rejects them.
  })
  .strict();

// ── location section ─────────────────────────────────────────────────────────
// Excludes structural routing keys id and slug.

const DayHoursSchema = z
  .object({
    label: z.string(),
    value: z.string(),
  })
  .strict();

const HoursSpecSchema = z
  .object({
    days: z.array(z.string()),
    opens: z.string(),
    closes: z.string(),
  })
  .strict();

const LocationSectionSchema = z
  .object({
    // id and slug are structural routing keys — omitted so .strict() rejects them.
    name: z.string().optional(),
    landmark: z.string().optional(),
    address: AddressSchema.optional(),
    phone: z.string().optional(),
    phoneHref: z.string().optional(),
    hours: z.array(DayHoursSchema).optional(),
    hoursSpec: z.array(HoursSpecSchema).optional(),
    geo: GeoSchema.optional(),
    bookerSlug: z.string().optional(),
  })
  .strict();

// ── services section ─────────────────────────────────────────────────────────
// Per-item override; id is the merge key (required). slug is structural — omit.

const ServiceOverrideSchema = z
  .object({
    id: ServiceIdSchema,
    price: z.number().optional(),
    priceTo: z.number().optional(),
    photo: z.boolean().optional(),
    // slug is a build-time routing key — omitted so .strict() rejects it.
  })
  .strict();

// ── content section ──────────────────────────────────────────────────────────
// Loose per-locale free-form records for UI copy overrides. No strict() here
// since the key set grows as new fields are added in the editor.

const ContentSectionSchema = z.object({
  fr: z.record(z.string(), z.unknown()).optional(),
  en: z.record(z.string(), z.unknown()).optional(),
});

// ── seo section ──────────────────────────────────────────────────────────────
// SEO override is a SEPARATE top-level namespace from `content` so SEO is edited
// independently of UI copy (see src/app/[lang]/seo-content.ts). Loose per-locale
// records like content — the SEO key set (meta, services, org, gallery) grows as
// new fields are added. Merged over the static base+tenant seo JSON at read time.

const SeoOverrideSchema = z.object({
  fr: z.record(z.string(), z.unknown()).optional(),
  en: z.record(z.string(), z.unknown()).optional(),
});

// ── custom code section ──────────────────────────────────────────────────────
// Admin-authored third-party snippets (analytics, pixels, chat, embeds). Unlike
// the other sections this is NOT a sparse override of static defaults — the array
// IS the source of truth (deepMerge arrays replace wholesale). Injected client-side
// by CustomCodeHost. `pages` holds canonical route keys or ["*"] for all pages.

const CustomCodeSnippetSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    code: z.string(),
    placement: z.enum(["head", "body-end"]),
    pages: z.array(z.string()),
    enabled: z.boolean(),
  })
  .strict();

export type CustomCodeSnippet = z.infer<typeof CustomCodeSnippetSchema>;

// ── outer schema ─────────────────────────────────────────────────────────────

export const StoreSettingsSchema = z
  .object({
    site: SiteSectionSchema.optional(),
    location: LocationSectionSchema.optional(),
    services: z.array(ServiceOverrideSchema).optional(),
    content: ContentSectionSchema.optional(),
    seo: SeoOverrideSchema.optional(),
    customCode: z.array(CustomCodeSnippetSchema).optional(),
  })
  .strict();

export type StoreSettings = z.infer<typeof StoreSettingsSchema>;
