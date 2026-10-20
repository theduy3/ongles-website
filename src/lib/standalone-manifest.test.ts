import { describe, expect, it } from "bun:test";
import {
  standaloneManifestHref,
  standaloneWebAppManifest,
} from "./standalone-manifest";

describe("standalone web app manifest", () => {
  it("points a saved kiosk page at itself, not the marketing home", () => {
    expect(standaloneManifestHref("/checkin")).toBe(
      "/standalone-manifest/checkin",
    );
    const manifest = standaloneWebAppManifest("/checkin", "Ongles et Spa Québec");
    expect(manifest).toMatchObject({
      id: "/checkin",
      start_url: "/checkin",
      scope: "/checkin",
      display: "standalone",
      short_name: "Check in",
    });
  });

  it("refuses a path that is not a standalone kiosk route", () => {
    expect(standaloneWebAppManifest("/fr", "Ongles et Spa Québec")).toBeNull();
    expect(standaloneWebAppManifest("/checkin/extra", "Ongles")).toBeNull();
  });
});
