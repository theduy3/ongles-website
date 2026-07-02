import { makeComparisonRoute } from "../../comparison-route";

// FR comparison route (/comparaisons/[slug]). Body lives in the shared
// comparison-route factory; this shell binds the FR locale. An EN slug under
// this folder fails the FR lookup and 404s.
const route = makeComparisonRoute("fr");

export const generateMetadata = route.generateMetadata;
export default route.Page;
