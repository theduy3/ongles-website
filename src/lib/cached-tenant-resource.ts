import { cache } from "react";
import { unstable_cache } from "next/cache";

// The shared caching seam for request-time tenant reads. Composes two layers:
//   1. unstable_cache — cross-request Next.js cache (revalidate, tag-purged on
//      admin write via revalidateTag).
//   2. React cache    — per-request dedupe so one render tree hits the cache once.
// Args are forwarded verbatim so unstable_cache keys on them (e.g. locale) in
// addition to keyParts. A resolver error propagates on its first throw — the
// seam adds no swallow/retry, so a genuine bug surfaces at its source.
export function cachedTenantResource<A extends unknown[], T>(
  keyParts: string[],
  opts: { tags: string[]; revalidate?: number },
  resolver: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  const cached = unstable_cache(resolver, keyParts, {
    tags: opts.tags,
    revalidate: opts.revalidate ?? 60,
  });

  return cache(cached);
}
