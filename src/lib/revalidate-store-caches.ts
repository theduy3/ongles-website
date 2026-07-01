import { revalidateTag } from "next/cache";
import { storeCacheTags } from "@/lib/cache-tags";

// Framework shell (kept apart from the pure tag owner so registration modules
// never transitively import next/cache). Purge every store cache derived from
// this tenant's settings — config, content, and SEO all resolve from the same
// store-settings doc, so an admin write invalidates the whole set. Iterates the
// tested storeCacheTags list, so a new namespace is purged automatically.
// Untested by design: a forEach over an already-tested list calling Next's
// revalidateTag — same untested-shell contract as the store IO in CONTEXT.md.
export function revalidateStoreCaches(tenantId: string): void {
  for (const tag of storeCacheTags(tenantId)) {
    revalidateTag(tag, "default");
  }
}
