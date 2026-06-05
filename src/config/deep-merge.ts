// Deep-merge for dictionary composition: base (shared UI chrome) + per-tenant
// override (SEO meta, location copy). The tenant override WINS on every leaf so a
// tenant can re-word any shared string; keys present only in base are inherited.
//
// Semantics (deliberate):
// - Plain objects merge recursively.
// - Arrays REPLACE wholesale (a tenant that overrides a list means to replace it,
//   not append — otherwise tenants could never shorten a base list).
// - Non-object leaves (string/number/bool/null) are taken from the override when
//   the override provides the key.

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function deepMerge<T extends Plain>(base: T, override: Plain): T {
  const result: Plain = { ...base };

  for (const key of Object.keys(override)) {
    const overrideValue = override[key];
    const baseValue = result[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }

  return result as T;
}
