import type en from "@/dictionaries/en.json";

// Canonical dictionary shape, derived from the English JSON. Lives outside the
// `server-only` dictionaries module so client components can import the type.
export type Dictionary = typeof en;
