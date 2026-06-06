// src/app/[lang]/legacy-seo-shim.ts
type Content = Record<string, unknown>;

// Back-compat shim. Before commit 9242623, operator SEO edits were saved under
// the `content` namespace; the SEO resolver now reads `seo` only, orphaning any
// such legacy DB row. liftLegacySeo() restructures the SEO-bearing subtrees of a
// legacy `content.{locale}` record into the new `seo.{locale}` shape so they keep
// rendering until the data is re-entered via the admin SEO section and this shim
// is removed. Pure: the input is already locale-scoped, so no locale arg.
//
//   meta.{pageKey}                                          -> meta.{pageKey}     (passthrough)
//   serviceDetails.{id}.{metaTitle,metaDescription,heroAlt} -> services.{id}.{..} (subset)
//   gallery.photos.{id}.alt                                 -> gallery.{id}.alt   (unwrap)
// `schemaDescription` (new) and `org` have no legacy source and are not produced.

const SERVICE_SEO_FIELDS = ["metaTitle", "metaDescription", "heroAlt"] as const;

function isPlainObject(v: unknown): v is Content {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function liftLegacySeo(content: Content | undefined): Content {
  if (!isPlainObject(content)) return {};
  const out: Content = {};

  if (isPlainObject(content.meta)) {
    out.meta = { ...content.meta };
  }

  if (isPlainObject(content.serviceDetails)) {
    const services: Content = {};
    for (const [id, detail] of Object.entries(content.serviceDetails)) {
      if (!isPlainObject(detail)) continue;
      const picked: Content = {};
      for (const field of SERVICE_SEO_FIELDS) {
        if (typeof detail[field] === "string") picked[field] = detail[field];
      }
      if (Object.keys(picked).length > 0) services[id] = picked;
    }
    if (Object.keys(services).length > 0) out.services = services;
  }

  if (isPlainObject(content.gallery) && isPlainObject(content.gallery.photos)) {
    const gallery: Content = {};
    for (const [id, photo] of Object.entries(content.gallery.photos)) {
      if (isPlainObject(photo) && typeof photo.alt === "string") {
        gallery[id] = { alt: photo.alt };
      }
    }
    if (Object.keys(gallery).length > 0) out.gallery = gallery;
  }

  return out;
}
