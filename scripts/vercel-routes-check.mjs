// @ts-check
/** The check behind scripts/check-build-headers.mjs, split out so tests can feed it configs. */
import { isDeepStrictEqual } from "node:util";
import { EMBED_PREFIX, headersForPath, LTI_PREFIX, vercelRoutes } from "./vercel-routes.mjs";

/** Request paths whose effective headers the check probes in the built config. */
export const PROBE_PATHS = [
  "/",
  "/pairs",
  "/pair/warfarin-fluconazole",
  "/drug/warfarin",
  "/class/azole-antifungal",
  "/embed",
  "/embed/pair/warfarin-fluconazole",
  "/embed/drug/warfarin",
  "/embed/class/azole-antifungal",
  "/api/lti",
  "/api/lti/login",
  "/api/lti/launch",
  "/api/lti/deep-link",
  "/api/lti/jwks",
  "/api/ltix/login",
  "/api/v1/check",
];

/**
 * Problems with a Build Output API config.json, or [] when every route made from
 * vercel.json is present, unchanged and before the filesystem and the server,
 * and each probed path ends up with exactly one CSP: frame-ancestors * under
 * /embed/ (and no X-Frame-Options there), the site's own frame-ancestors elsewhere,
 * except under /api/lti/, which must get no CSP and no X-Frame-Options from these
 * routes (the LTI handler sends its own) but still gets HSTS.
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
  if (problems.length) return problems;
  for (const path of PROBE_PATHS) problems.push(...probe(routes, want, path));
  return problems;
}

/**
 * @param {any[]} routes
 * @param {ReturnType<typeof vercelRoutes>} want
 * @param {string} path
 */
function probe(routes, want, path) {
  const got = headersForPath(routes, path);
  const expected = headersForPath(want, path).headers["content-security-policy"];
  const csp = got.headers["content-security-policy"] ?? "";
  const ancestors = /(?:^|;\s*)frame-ancestors ([^;]*)/.exec(csp)?.[1]?.trim();
  const out = [];
  if (path.startsWith(LTI_PREFIX)) {
    if (got.cspRoutes !== 0) out.push(`${path}: ${got.cspRoutes} routes set a Content-Security-Policy, want none (the LTI handler sends its own)`);
    if (got.headers["x-frame-options"]) out.push(`${path}: LTI paths must not send X-Frame-Options`);
    if (!got.headers["strict-transport-security"]) out.push(`${path}: missing Strict-Transport-Security`);
    return out;
  }
  if (got.cspRoutes !== 1) out.push(`${path}: ${got.cspRoutes} routes set a Content-Security-Policy, want exactly 1`);
  if (csp !== expected) out.push(`${path}: Content-Security-Policy differs from vercel.json`);
  if (path.startsWith(EMBED_PREFIX)) {
    if (ancestors !== "*") out.push(`${path}: embed pages need frame-ancestors *, got ${ancestors ?? "none"}`);
    if (got.headers["x-frame-options"]) out.push(`${path}: embed pages must not send X-Frame-Options`);
  } else if (!ancestors || ancestors.split(/\s+/).includes("*")) {
    out.push(`${path}: frame-ancestors must stay restricted, got ${ancestors ?? "none"}`);
  }
  return out;
}
