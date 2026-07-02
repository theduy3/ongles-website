import { makePricingRoute } from "../pricing-route";

// EN pricing route (/pricing). Body lives in the shared pricing-route factory;
// this shell binds the EN locale. /pricing is EN-only: non-en lang → 404.
const route = makePricingRoute("en");

export const generateMetadata = route.generateMetadata;
export default route.Page;
