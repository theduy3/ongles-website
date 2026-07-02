import { makePricingRoute } from "../pricing-route";

// FR pricing route (/tarifs). Body lives in the shared pricing-route factory;
// this shell binds the FR locale. /tarifs is FR-only: non-fr lang → 404.
const route = makePricingRoute("fr");

export const generateMetadata = route.generateMetadata;
export default route.Page;
