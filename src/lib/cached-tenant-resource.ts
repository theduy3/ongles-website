import { cache } from "react";
import { unstable_cache } from "next/cache";

// The shared caching seam for request-time tenant reads. Wraps three layers:
//   1. unstable_cache — cross-request Next.js cache (revalidate, tag-purged on
//      admin write via revalidateTag).
//   2. React cache    — per-request dedupe so one render tree hits the cache once.
//   3. try/catch fallback — unstable_cache throws outside a Next.js runtime
//      (bun:test, scripts); we transparently run the resolver uncached there.
// Args are forwarded verbatim so unstable_cache keys on them (e.g. locale) in
// addition to keyParts. Behavior is identical to the hand-rolled dance it replaces
// (including the deliberately broad catch — narrowing it is a separate change).
export function cachedTenantResource<A extends unknown[], T>(
  keyParts: string[],
  opts: { tags: string[]; revalidate?: number },
  resolver: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  const cached = unstable_cache(resolver, keyParts, {
    tags: opts.tags,
    revalidate: opts.revalidate ?? 60,
  });

  const withFallback = async (...args: A): Promise<T> => {
    try {
      return await cached(...args);
    } catch {
      // Outside a Next.js runtime (tests, scripts) — run uncached.
      return resolver(...args);
    }
  };

  return cache(withFallback);
}
