// @ts-check
/** The check behind scripts/check-build-headers.mjs, split out so tests can feed it configs. */
import { isDeepStrictEqual } from "node:util";
import { vercelRoutes } from "./vercel-routes.mjs";

/**
 * Problems with a Build Output API config.json, or [] when every route made from
 * vercel.json is present, unchanged and before the filesystem and the server.
 * @param {any} config
 * @param {ReturnType<typeof vercelRoutes>} [want]
 * @returns {string[]}
 */
export function checkBuildConfig(config, want = vercelRoutes()) {
  const routes = Array.isArray(config?.routes) ? config.routes : null;
  if (!routes) return ["config.json has no routes array"];
  if (!want.some((r) => r.headers["Content-Security-Policy"])) return ["vercel.json sends no Content-Security-Policy"];
  const problems = [];
  const stop = routes.findIndex(
    (/** @type {any} */ r) => r && (r.handle === "filesystem" || (typeof r.dest === "string" && r.dest.startsWith("/__"))),
  );
  for (const route of want) {
    const at = routes.findIndex((/** @type {any} */ r) => isDeepStrictEqual(r, route));
    if (at < 0) problems.push(`missing route ${route.src}`);
    else if (stop >= 0 && at > stop) problems.push(`route ${route.src} comes after the filesystem or server route`);
  }
  return problems;
}
