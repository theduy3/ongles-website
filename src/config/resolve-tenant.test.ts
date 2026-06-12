import { test, expect } from "bun:test";
import { resolveTenant, TENANT_REGISTRY } from "./index";

test("resolves a known tenant id", () => {
  expect(resolveTenant("ongles-charlesbourg").id).toBe("ongles-charlesbourg");
  expect(resolveTenant("ongles-rivieres").id).toBe("ongles-rivieres");
});

test("defaults to ongles-maily when undefined", () => {
  expect(resolveTenant(undefined).id).toBe("ongles-maily");
});

test("throws loudly on an unknown tenant id", () => {
  expect(() => resolveTenant("nope")).toThrow(/Unknown TENANT/);
});

test("registry contains all three live tenants + template", () => {
  expect(Object.keys(TENANT_REGISTRY).sort()).toEqual(
    ["ongles-charlesbourg", "ongles-maily", "ongles-rivieres", "template"].sort(),
  );
});
