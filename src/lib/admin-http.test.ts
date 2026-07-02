import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { respondToWrite, type AdminWriteResult } from "@/lib/admin-http";

// respondToWrite is the pure core of an admin write (auth-free), so the whole
// status-code contract — previously triplicated across the admin routes and
// untested — is exercised here without a session. The guard/401 edge is the
// thin framework shell (untested, per ADR 0003).

const Schema = z.object({ id: z.string() });
type Data = z.infer<typeof Schema>;

const req = (body: string) =>
  new Request("http://test/admin", { method: "PUT", body });

// A `run` that echoes whatever result we want to test the mapping for.
const runReturning =
  (result: AdminWriteResult<Data>) => async () => result;

describe("respondToWrite — status-code contract", () => {
  test("invalid JSON → 400", async () => {
    const res = await respondToWrite(req("{not json"), Schema, runReturning({ ok: true, data: { id: "x" } }), {});
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  test("schema failure → 422", async () => {
    const res = await respondToWrite(req(JSON.stringify({ id: 123 })), Schema, runReturning({ ok: true, data: { id: "x" } }), {});
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false });
  });

  test("run returns invalid → 422 with its detail", async () => {
    const res = await respondToWrite(
      req(JSON.stringify({ id: "a" })),
      Schema,
      runReturning({ ok: false, reason: "invalid", detail: "id mismatch" }),
      {},
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false, error: "id mismatch" });
  });

  test("store not_configured → 503", async () => {
    const res = await respondToWrite(
      req(JSON.stringify({ id: "a" })),
      Schema,
      runReturning({ ok: false, reason: "not_configured" }),
      {},
    );
    expect(res.status).toBe(503);
  });

  test("store failed → 502", async () => {
    const res = await respondToWrite(
      req(JSON.stringify({ id: "a" })),
      Schema,
      runReturning({ ok: false, reason: "failed", detail: "boom" }),
      {},
    );
    expect(res.status).toBe(502);
  });

  test("ok → 200 with data", async () => {
    const res = await respondToWrite(
      req(JSON.stringify({ id: "a" })),
      Schema,
      runReturning({ ok: true, data: { id: "a" } }),
      {},
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { id: "a" } });
  });

  test("run receives the validated data and ctx", async () => {
    let seen: { data: Data; ctx: { tag: string } } | null = null;
    const res = await respondToWrite(
      req(JSON.stringify({ id: "z" })),
      Schema,
      async (data, ctx: { tag: string }) => {
        seen = { data, ctx };
        return { ok: true, data };
      },
      { tag: "ctx-passed" },
    );
    expect(res.status).toBe(200);
    expect(seen).toEqual({ data: { id: "z" }, ctx: { tag: "ctx-passed" } });
  });
});
