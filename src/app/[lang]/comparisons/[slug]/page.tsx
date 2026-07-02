import { makeComparisonRoute } from "../../comparison-route";

// EN comparison route (/comparisons/[slug]). Body lives in the shared
// comparison-route factory; this shell binds the EN locale. A FR slug under
// this folder fails the EN lookup and 404s.
const route = makeComparisonRoute("en");

export const generateMetadata = route.generateMetadata;
export default route.Page;
