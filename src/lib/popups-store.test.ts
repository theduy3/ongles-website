import { describe, expect, it, spyOn } from "bun:test";
import { parseRows } from "@/lib/popups-store";

// parseRows is the popups degrade core: parse each row's doc through PopupSchema,
// DROP any row that no longer matches (stale/old shape), never throw. Fed plain
// rows — no Supabase client — so the drop contract is reachable through the seam.

const validRow = (id: string) => ({
  id,
  doc: { id, type: "embed", html: `<div>${id}</div>` },
});

describe("parseRows", () => {
  it("keeps valid rows, drops invalid, preserves order", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    try {
      const rows = [
        validRow("a"),
        { id: "bad", doc: { type: "embed" /* missing html */ } },
        validRow("b"),
      ];
      const out = parseRows(rows);
      expect(out.map((p) => p.id)).toEqual(["a", "b"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("returns [] for no rows", () => {
    expect(parseRows([])).toEqual([]);
  });

  it("never throws on garbage docs and logs once per dropped row (label = row id)", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    try {
      const rows = [
        { id: "g1", doc: null },
        { id: "g2", doc: "not-an-object" },
      ];
      expect(() => parseRows(rows)).not.toThrow();
      expect(parseRows(rows)).toEqual([]);
      // 2 rows dropped per call, called twice above = 4; assert label carried.
      expect(spy.mock.calls.some((c: unknown[]) => String(c[0]).includes("g1"))).toBe(true);
      expect(spy.mock.calls.some((c: unknown[]) => String(c[0]).includes("g2"))).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
