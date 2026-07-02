// schema-invariants-text.ts
// Pure, dependency-free text utilities + content-depth constants extracted from
// schema-invariants.ts (D-05/D-11/D-13). Split out because they are a distinct,
// reusable concern (generic string analysis) with ZERO tenant/registry deps —
// schema-invariants.ts imports them back for its per-tenant checks.
//
// SAME BUILD-GUARD CONSTRAINT as schema-invariants.ts: this module runs inside
// the next.config.ts SWC require-hook, so it must stay ALIAS-FREE and
// side-effect-free. It has NO imports at all, which trivially satisfies that.

// ─── Phase 3 content-depth constants (D-05/D-11/D-13) ───────────────────────────

/** D-05 — minimum merged (base + tenant) FAQ items per tenant per locale. */
export const FAQ_FLOOR = 20 as const;
/** D-11 — minimum sentences in a non-empty answer block. */
export const ANSWER_BLOCK_MIN_SENTENCES = 2 as const;

// ─── Phase 4: net-new-page guard constants (LOCKED — do not change without a plan) ──
// Canonical source of truth referenced by checkWordCount / checkCrossTenantOverlap
// in schema-invariants.ts. Exported so tests can assert the exact numeric contract.

/** P4 — minimum word count for comparison page body sections (any slug). */
export const COMPARISON_WORD_FLOOR = 200 as const;
/** P4 — minimum word count for nearMe page answerBlock. */
export const NEAR_ME_WORD_FLOOR = 150 as const;
/** P4 — Jaccard sentence-overlap threshold above which two tenants are "too similar". */
export const NEW_PAGE_OVERLAP_THRESHOLD = 0.30 as const;

/**
 * D-13 — abbreviation periods that must NOT be read as sentence boundaries.
 * These are titles/units that always precede a noun (e.g. "Mme. Tremblay",
 * "av. Royale"). "etc" is deliberately EXCLUDED: it commonly closes a sentence
 * ("…, etc. Réservez …" is two sentences), pinned by schema-invariants.test.ts.
 */
const PROTECTED_ABBREVS = [
  "M", "Mme", "Mlle", "Me", "Dr", "Dre",
  "St", "Ste", "av", "bd", "boul", "no", "vol", "vs", "env", "approx", "p", "pp",
] as const;

const DOT = ""; // sentinel for a protected period (SOH)
const ELLIPSIS = ""; // sentinel for a protected "..." (STX)

/**
 * Pure, dependency-free sentence splitter (D-13). Protects decimals, ellipsis,
 * and title/unit abbreviation periods, then splits on sentence-ending punctuation
 * followed by whitespace and a capital/opening-quote. Alias-free so it is safe to
 * run inside the next.config.ts build guard (SWC require-hook constraint).
 */
export function splitSentences(text: string): string[] {
  if (typeof text !== "string") return [];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  let s = trimmed
    .replace(/(\d)\.(\d)/g, `$1${DOT}$2`) // decimals: 40.50
    .replace(/\.\.\./g, ELLIPSIS); // ellipsis

  const abbrevRe = new RegExp(`\\b(${PROTECTED_ABBREVS.join("|")})\\.`, "g");
  s = s.replace(abbrevRe, `$1${DOT}`);

  return s
    .split(/(?<=[.!?])\s+(?=[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ"«])/)
    .map((part) =>
      part.replaceAll(DOT, ".").replaceAll(ELLIPSIS, "...").trim(),
    )
    .filter((part) => part.length > 0);
}

/** Pure word counter (D-13) — whitespace-delimited tokens, 0 for empty input. */
export function countWords(text: string): number {
  if (typeof text !== "string") return 0;
  const t = text.trim();
  if (t.length === 0) return 0;
  return t.split(/\s+/).length;
}

/** D-05 predicate — true when a merged FAQ count is below the floor. */
export function isFaqBelowFloor(mergedCount: number): boolean {
  return mergedCount < FAQ_FLOOR;
}

/** D-11 predicate — true when an answer block is missing or under the sentence floor. */
export function isAnswerBlockInsufficient(text: string): boolean {
  if (typeof text !== "string" || text.trim().length === 0) return true;
  return splitSentences(text).length < ANSWER_BLOCK_MIN_SENTENCES;
}

/**
 * Pure normalized-sentence Jaccard overlap (P4 / 04-RESEARCH Q3).
 *
 * Algorithm:
 *   1. Lowercase both texts, strip non-word punctuation (keep apostrophes),
 *      collapse whitespace.
 *   2. Split into sentences via splitSentences().
 *   3. Compute Set Jaccard: |intersection| / |union|.
 *
 * Returns 1.0 for identical text, 0 for fully disjoint sets.
 * Exported so tests can assert the overlap algorithm independently.
 */
export function measureSentenceOverlap(textA: string, textB: string): number {
  // Normalize a single sentence (already split) to a canonical form for comparison.
  const normalizeSentence = (s: string): string =>
    s
      .toLowerCase()
      // strip non-word punctuation except apostrophes (French contractions)
      .replace(/[^a-z0-9àâäéèêëîïôùûüœç'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const sentencesOf = (t: string): Set<string> => {
    // Split first (preserving periods for the splitter), then normalize each sentence.
    const sentences = splitSentences(t);
    return new Set(
      sentences
        .map(normalizeSentence)
        .filter((s) => s.length > 0),
    );
  };

  const setA = sentencesOf(textA);
  const setB = sentencesOf(textB);

  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection++;
  }

  // Jaccard = |A ∩ B| / |A ∪ B|  where |A ∪ B| = |A| + |B| - |A ∩ B|
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
