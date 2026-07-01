import { describe, expect, it, spyOn } from "bun:test";
import { z } from "zod";
import { parseWithSchema } from "@/lib/tenant-store";

const Schema = z.object({ id: z.string(), price: z.number() });

describe("parseWithSchema", () => {
  it("returns the parsed data when the schema validates", () => {
    const result = parseWithSchema(Schema, { id: "svc-1", price: 10 }, "svc-1");
    expect(result).toEqual({ id: "svc-1", price: 10 });
  });

  it("returns null and logs when the schema rejects", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = parseWithSchema(Schema, { id: "svc-1", price: "not-a-number" }, "svc-1");
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain("svc-1");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("never throws on malformed raw input", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => parseWithSchema(Schema, null, "malformed")).not.toThrow();
      expect(() => parseWithSchema(Schema, undefined, "malformed")).not.toThrow();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
