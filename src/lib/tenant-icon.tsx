// Per-tenant brand icon renderer. The build is one universal image with TENANT
// set at container runtime, so any baked-in asset is shared across tenants:
// manifest.ts previously advertised public/icon-192/512.png — the Pure Nail Bar
// "S" swirl from the template clone — which is the logo Google showed for every
// tenant in SERPs. Rendering at request time gives each tenant its own mark.
// An admin-uploaded site.favicon URL still wins via metadata.icons.
import { ImageResponse } from "next/og";
import { tenant, type TenantId } from "@/config";

// Neutral site chrome (header bg #141414) — deliberately NOT Maily's pink
// (#ee068f); a pink mark would keep Maily's identity on sibling tenants.
const ICON_BG = "#141414";

// One letter per brand — the salons share the "Ongles" word, so letter #1 is
// meaningless and name parsing is fragile ("Ongles et Spa Québec" → "Q").
// Record<TenantId,...> makes adding a tenant without a monogram a type error.
const MONOGRAMS: Record<TenantId, string> = {
  "ongles-maily": "M",
  "ongles-charlesbourg": "C",
  "ongles-rivieres": "R",
  "ongles-cite": "Q",
  template: "S",
};

export function tenantIconImage(px: number) {
  const letter = MONOGRAMS[tenant.id];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: ICON_BG,
          color: "white",
          fontSize: Math.round(px * 0.62),
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {letter}
      </div>
    ),
    { width: px, height: px },
  );
}
