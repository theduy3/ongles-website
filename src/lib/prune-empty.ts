// Recursively strip "empty" values from a plain value tree, returning a NEW value
// (never mutates the input). Empty = undefined | null | "" | [] | {} (the last two
// after recursion). KEPT = numbers (incl 0), booleans (incl false), and non-empty
// strings / arrays / objects.
//
// Used to build sparse override docs (settings-draft.ts): an absent field falls
// through to the static tenant default at the deep-merge layer, so an empty value
// must never be persisted where it would freeze over a good default.

type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  // Only real plain objects ({} or Object.create(null)) recurse. Date/Map/Set/
  // class instances fall through and are returned as-is (never dropped/rebuilt).
  return proto === Object.prototype || proto === null;
}

export function pruneEmpty<T>(value: T): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (Array.isArray(value)) {
    const arr = value
      .map((item) => pruneEmpty(item))
      .filter((item) => item !== undefined);
    return (arr.length > 0 ? arr : undefined) as T | undefined;
  }

  if (isPlainObject(value)) {
    const out: Plain = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEmpty(v);
      if (pruned !== undefined) out[k] = pruned;
    }
    return (Object.keys(out).length > 0 ? out : undefined) as T | undefined;
  }

  return value; // number (incl 0), boolean (incl false), or non-empty string
}
