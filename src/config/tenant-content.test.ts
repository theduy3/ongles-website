import { describe, expect, it } from "bun:test";
import { TENANT_REGISTRY } from "@/config";
import { BASE_CONTENT, BASE_SEO, TENANT_CONTENT, TENANT_SEO } from "@/config/tenant-content";

describe("tenant-content registry", () => {
  it("TENANT_CONTENT has exactly the tenants in TENANT_REGISTRY", () => {
    expect(Object.keys(TENANT_CONTENT).sort()).toEqual(
      Object.keys(TENANT_REGISTRY).sort(),
    );
  });

  it("TENANT_SEO has exactly the tenants in TENANT_REGISTRY", () => {
    expect(Object.keys(TENANT_SEO).sort()).toEqual(
      Object.keys(TENANT_REGISTRY).sort(),
    );
  });

  it("BASE_CONTENT has fr and en", () => {
    expect(Object.keys(BASE_CONTENT).sort()).toEqual(["en", "fr"]);
  });

  it("BASE_SEO has fr and en", () => {
    expect(Object.keys(BASE_SEO).sort()).toEqual(["en", "fr"]);
  });
});
