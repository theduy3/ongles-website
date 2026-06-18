// schema-invariants.ts
// Offline schema invariant asserter — mirrors the structure of config-completeness.ts.
//
// CRITICAL CONSTRAINTS (enforced by Task 3 + Phase 1 lesson):
//   - PURE MODULE: no process.env reads, no network calls, no side effects.
//   - STATIC IMPORTS ONLY: next.config.ts imports this file. Next's SWC
//     require-hook only resolves `.ts` chains when the compiled code uses
//     `require(` (static import → CJS). A dynamic `import()` bypasses the hook
//     and causes MODULE_NOT_FOUND in Node 20 Docker. Every import here must be
//     a top-level static import.
//   - EXCLUDED_TENANTS: "template" is a clone source, not a live deployment.
//
// Invariant groups checked per non-template tenant:
//   @context   — every graph root equals "https://schema.org"
//   @id        — business/location/organization nodes derive from canonicalUrl
//   I-02       — no two tenants share a business @id (cross-tenant uniqueness)
//   I-03       — sameAs absent or non-empty, never []
//   R-02       — AggregateRating suppressed when fetchedAt null or reviewCount < 5
//   NailSalon  — required fields present: name, url, telephone, address, geo,
//                openingHoursSpecification
//   O-01       — distinct Organization node with #organization @id present
//   FAQ        — faqPageGraph preserves item count (not dropped by builder)
//   offer()    — AggregateOffer when priceTo > price, else Offer (SCHEMA-02)

import { TENANT_REGISTRY } from "./index";
import { organizationGraph, servicesGraph, faqPageGraph, serviceGraph } from "../lib/seo";
import type { SeoConfig } from "../lib/seo";

/** Tenants excluded from schema invariant checks (clone sources, not live deployments). */
const EXCLUDED_TENANTS = new Set(["template"]);

// ─── Public types ─────────────────────────────────────────────────────────────

/** Per-tenant schema invariant error. */
export type SchemaInvariantError = {
  tenantId: string;
  invariant: string;
  message: string;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Build a SeoConfig for a tenant by id — uses only static tenant registry data
 *  (no process.env, no module singleton). This is the pitfall-2 fix: each tenant
 *  gets its own explicit SeoConfig so reviewData suppression is tenant-correct. */
function tenantSeoConfig(id: keyof typeof TENANT_REGISTRY): SeoConfig {
  const cfg = TENANT_REGISTRY[id];
  return {
    site: cfg.site,
    locations: [cfg.location],
    reviewData: cfg.reviewData,
  };
}

/** Extract graph nodes as plain objects (typed as unknown for safe property access). */
function graphNodes(graph: ReturnType<typeof organizationGraph>): Array<Record<string, unknown>> {
  return graph["@graph"] as unknown as Array<Record<string, unknown>>;
}

/** Find the business node (ends with #business) in an org graph. */
function findBusinessNode(nodes: Array<Record<string, unknown>>): Record<string, unknown> | undefined {
  return nodes.find((n) => typeof n["@id"] === "string" && String(n["@id"]).endsWith("#business"));
}

/** Find the organization node (ends with #organization) in an org graph. */
function findOrgNode(nodes: Array<Record<string, unknown>>): Record<string, unknown> | undefined {
  return nodes.find(
    (n) => n["@type"] === "Organization" && typeof n["@id"] === "string" && String(n["@id"]).endsWith("#organization"),
  );
}

// ─── Per-invariant checkers ───────────────────────────────────────────────────

/** Check @context on org graph root. */
function checkContext(
  tenantId: string,
  graph: ReturnType<typeof organizationGraph>,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  if (graph["@context"] !== "https://schema.org") {
    errors.push({
      tenantId,
      invariant: "@context",
      message: `organizationGraph @context is "${String(graph["@context"])}", expected "https://schema.org"`,
    });
  }
  return errors;
}

/** Check @id format: business, location, and organization nodes must derive from canonicalUrl. */
function checkIds(
  tenantId: string,
  canonicalUrl: string,
  nodes: Array<Record<string, unknown>>,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const expectedBusiness = `${canonicalUrl}/#business`;
  const expectedOrg = `${canonicalUrl}/#organization`;
  const locationPrefix = `${canonicalUrl}/#location-`;

  const business = findBusinessNode(nodes);
  if (!business) {
    errors.push({ tenantId, invariant: "@id", message: "business node (#business) missing from @graph" });
  } else if (business["@id"] !== expectedBusiness) {
    errors.push({
      tenantId,
      invariant: "@id",
      message: `business @id is "${String(business["@id"])}", expected "${expectedBusiness}"`,
    });
  }

  const org = findOrgNode(nodes);
  if (!org) {
    errors.push({ tenantId, invariant: "@id", message: "organization node (#organization) missing from @graph" });
  } else if (org["@id"] !== expectedOrg) {
    errors.push({
      tenantId,
      invariant: "@id",
      message: `organization @id is "${String(org["@id"])}", expected "${expectedOrg}"`,
    });
  }

  const locationNodes = nodes.filter(
    (n) => typeof n["@id"] === "string" && String(n["@id"]).includes("#location-"),
  );
  for (const loc of locationNodes) {
    if (!String(loc["@id"]).startsWith(locationPrefix)) {
      errors.push({
        tenantId,
        invariant: "@id",
        message: `location @id "${String(loc["@id"])}" does not start with "${locationPrefix}"`,
      });
    }
  }

  return errors;
}

/** Check I-03: sameAs absent or non-empty on business node (never []). */
function checkSameAs(
  tenantId: string,
  nodes: Array<Record<string, unknown>>,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const business = findBusinessNode(nodes);
  if (!business) return errors; // @id check will catch the missing node
  const sameAs = business["sameAs"];
  if (sameAs !== undefined && Array.isArray(sameAs) && sameAs.length === 0) {
    errors.push({
      tenantId,
      invariant: "I-03",
      message: "business node sameAs is [] (empty array) — must be absent or non-empty",
    });
  }
  return errors;
}

/** Check R-02: AggregateRating gated on fetchedAt + reviewCount >= 5. */
function checkAggregateRating(
  tenantId: string,
  nodes: Array<Record<string, unknown>>,
  reviewData: SeoConfig["reviewData"],
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  if (!reviewData) return errors; // no reviewData override — skip
  const business = findBusinessNode(nodes);
  if (!business) return errors;

  const rd = reviewData;
  const hasRealRating = rd.fetchedAt !== null && rd.aggregate.reviewCount >= 5;
  const hasAggRating = business["aggregateRating"] !== undefined;

  if (!hasRealRating && hasAggRating) {
    errors.push({
      tenantId,
      invariant: "R-02",
      message:
        `aggregateRating present but fetchedAt=${String(rd.fetchedAt)} reviewCount=${rd.aggregate.reviewCount}` +
        " — R-02 gate failed (must suppress when fetchedAt null or reviewCount < 5)",
    });
  }
  if (hasRealRating && !hasAggRating) {
    errors.push({
      tenantId,
      invariant: "R-02",
      message:
        `aggregateRating suppressed but fetchedAt=${String(rd.fetchedAt)} reviewCount=${rd.aggregate.reviewCount}` +
        " — R-02 gate failed (must emit when fetchedAt set and reviewCount >= 5)",
    });
  }
  return errors;
}

/** Check required NailSalon fields on business node. */
function checkRequiredFields(
  tenantId: string,
  nodes: Array<Record<string, unknown>>,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const business = findBusinessNode(nodes);
  if (!business) return errors;

  const required = ["name", "url", "telephone", "address", "geo", "openingHoursSpecification"] as const;
  for (const field of required) {
    if (business[field] === undefined || business[field] === null || business[field] === "") {
      errors.push({
        tenantId,
        invariant: "NailSalon",
        message: `required field "${field}" missing or empty on business node`,
      });
    }
  }
  return errors;
}

/** Check O-01: distinct Organization node present. */
function checkOrganizationNode(
  tenantId: string,
  nodes: Array<Record<string, unknown>>,
): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const org = findOrgNode(nodes);
  if (!org) {
    errors.push({
      tenantId,
      invariant: "O-01",
      message: "no distinct Organization node with @type=Organization and @id ending in #organization",
    });
  }
  return errors;
}

/** Check I-02: no cross-tenant business @id collision. Run once across all tenants. */
function checkIdUniqueness(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];
  const seen = new Map<string, string>(); // bid → first tenantId

  for (const [id, cfg] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const bid = `${cfg.site.canonicalUrl}/#business`;
    if (seen.has(bid)) {
      errors.push({
        tenantId: id,
        invariant: "I-02",
        message: `business @id "${bid}" already used by tenant "${seen.get(bid)}" — cross-tenant collision`,
      });
    } else {
      seen.set(bid, id);
    }
  }
  return errors;
}

/** Check FAQ: faqPageGraph preserves item count for a sample input. */
function checkFaqItemCount(tenantId: string): SchemaInvariantError[] {
  const sampleItems = [
    { q: "Sample Q1?", a: "Sample A1." },
    { q: "Sample Q2?", a: "Sample A2." },
  ];
  const graph = faqPageGraph(sampleItems);
  const mainEntity = graph["mainEntity"] as unknown as unknown[];
  if (!Array.isArray(mainEntity) || mainEntity.length !== sampleItems.length) {
    return [
      {
        tenantId,
        invariant: "FAQ",
        message: `faqPageGraph dropped items: input ${sampleItems.length}, output ${Array.isArray(mainEntity) ? mainEntity.length : "N/A"}`,
      },
    ];
  }
  return [];
}

/** Check offer(): AggregateOffer when priceTo > price, else Offer (SCHEMA-02). */
function checkOfferType(tenantId: string, cfg: SeoConfig): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  // Positive AggregateOffer path
  const rangeGraph = serviceGraph("fr", { name: "Test", description: "d", price: 10, priceTo: 20 }, cfg);
  const rangeOffer = rangeGraph["offers"] as Record<string, unknown>;
  if (rangeOffer["@type"] !== "AggregateOffer") {
    errors.push({
      tenantId,
      invariant: "SCHEMA-02",
      message: `offer() with priceTo > price emitted @type="${String(rangeOffer["@type"])}", expected "AggregateOffer"`,
    });
  }

  // Plain Offer path
  const singleGraph = serviceGraph("fr", { name: "Test", description: "d", price: 10 }, cfg);
  const singleOffer = singleGraph["offers"] as Record<string, unknown>;
  if (singleOffer["@type"] !== "Offer") {
    errors.push({
      tenantId,
      invariant: "SCHEMA-02",
      message: `offer() without priceTo emitted @type="${String(singleOffer["@type"])}", expected "Offer"`,
    });
  }

  return errors;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Iterates all non-excluded tenants in TENANT_REGISTRY and checks each against
 * the schema invariant set. Returns an array of per-tenant errors.
 * An empty array means all tenants pass all invariants.
 *
 * Pure function — no process.env reads, no network, no side effects.
 */
export function validateSchemaInvariants(): SchemaInvariantError[] {
  const errors: SchemaInvariantError[] = [];

  // I-02 uniqueness check is cross-tenant — run once before the per-tenant loop.
  errors.push(...checkIdUniqueness());

  for (const [id] of Object.entries(TENANT_REGISTRY)) {
    if (EXCLUDED_TENANTS.has(id)) continue;
    const tenantId = id as keyof typeof TENANT_REGISTRY;
    const cfg = tenantSeoConfig(tenantId);
    const graph = organizationGraph("fr", { name: cfg.site.name, description: "Salon" }, cfg);
    const nodes = graphNodes(graph);

    errors.push(
      ...checkContext(id, graph),
      ...checkIds(id, cfg.site.canonicalUrl, nodes),
      ...checkSameAs(id, nodes),
      ...checkAggregateRating(id, nodes, cfg.reviewData),
      ...checkRequiredFields(id, nodes),
      ...checkOrganizationNode(id, nodes),
      ...checkFaqItemCount(id),
      ...checkOfferType(id, cfg),
    );
  }

  return errors;
}

/**
 * Asserts that every non-excluded tenant in TENANT_REGISTRY passes all schema
 * invariants. Throws a formatted Error listing every failing invariant.
 * Returns silently when all invariants pass.
 *
 * Designed to be called from next.config.ts under PHASE_PRODUCTION_BUILD so a
 * schema violation aborts `next build` (exit 1 via Next.js printAndExit) and
 * the Dokploy deploy. Mirrors assertAllTenantsComplete() from config-completeness.ts.
 */
export function assertSchemaInvariants(): void {
  const errors = validateSchemaInvariants();
  if (errors.length === 0) return;

  const grouped = new Map<string, SchemaInvariantError[]>();
  for (const err of errors) {
    const existing = grouped.get(err.tenantId) ?? [];
    existing.push(err);
    grouped.set(err.tenantId, existing);
  }

  const message = Array.from(grouped.entries())
    .map(
      ([tenantId, errs]) =>
        `Tenant "${tenantId}" has schema invariant violations:\n` +
        errs.map((e) => `  [${e.invariant}] ${e.message}`).join("\n"),
    )
    .join("\n\n");

  throw new Error(
    `\n\nSchema invariant check FAILED — fix before deploying:\n\n${message}\n`,
  );
}
