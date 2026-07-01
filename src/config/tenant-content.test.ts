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

  it("every TENANT_REGISTRY entry is the single seam carrying content/seo/faq", () => {
    // The collapse contract: a tenant's own index.ts owns all its assets, and the
    // downstream maps derive from here. A tenant registered without an asset fails
    // to compile at tenant-content.ts / get-tenant-faq.ts; this pins it at runtime.
    for (const [id, t] of Object.entries(TENANT_REGISTRY)) {
      expect(Object.keys(t.content).sort(), `${id}.content`).toEqual(["en", "fr"]);
      expect(Object.keys(t.seo).sort(), `${id}.seo`).toEqual(["en", "fr"]);
      expect(Object.keys(t.faq).sort(), `${id}.faq`).toEqual(["en", "fr"]);
    }
  });
});
