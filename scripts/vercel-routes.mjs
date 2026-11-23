// @ts-check
/**
 * Turns vercel.json's `headers` and `redirects` into Build Output API routes,
 * which the Nitro "vercel" preset writes into .vercel/output/config.json
 * (vite.config.ts passes them as `nitro({ vercel: { config: { routes } } })`).
 *
 * Why: the build writes a Build Output API folder, and the preset builds
 * config.json from its own route rules. It reads vercel.json only for settings
 * such as bunVersion. Before this, the built config.json had no CSP, no other
 * security header and no redirect, so whether they reached visitors rested on
 * Vercel merging vercel.json into prebuilt output. Now they are in the output
 * itself. vercel.json stays the one place to edit them; if Vercel also applies
 * it, the values are identical. scripts/check-build-headers.mjs checks the build.
 *
 * Our routes come first in config.json, ahead of Nitro's, so they cover
 * prerendered pages, static files and the server function alike.
 * GitHub Pages cannot send response headers, so none of this applies there.
 *
 * Supported `source` shapes: plain paths, the catch-all "/(.*)", a prefix
 * catch-all such as "/embed/(.*)" or "/api/lti/(.*)", and a complement of one or
 * more prefixes such as "/((?!embed/|api/lti/).*)". Anything else throws at build
 * time rather than being translated wrong.
 *
 * Framing: the site CSP's frame-ancestors lists only 'self' and the grok hosts.
 * /embed/* (the iframe-able pair cards, src/routes/embed.pair.$slug.tsx) gets the
 * same headers with `frame-ancestors *`, so any course page can frame it. The two
 * rules are written as complements ("/((?!embed/).*)" and "/embed/(.*)") so each
 * path gets exactly one Content-Security-Policy, whatever order or merge Vercel
 * applies; scripts/vercel-routes-check.mjs probes the built config for that.
 * Nothing sends X-Frame-Options (CSP frame-ancestors supersedes it).
 *
 * /api/lti/* (LTI 1.3 course links) gets no CSP from here at all, only HSTS and
 * Permissions-Policy. Canvas frames the deep-link content picker and takes a form
 * post back from it, which the site CSP's frame-ancestors and form-action would
 * block. The LTI handler sends its own CSP on every response it makes
 * (src/lib/lti/lti.server.ts): the picker pages allow framing and posting only
 * by the one Canvas host that launched them; plain-text and JSON answers send
 * default-src 'none' (nothing loads, nothing posts) so an error can still show
 * inside the Canvas frame. Redirects carry none. LTI is off unless LTI_ENABLED=1.
 *
 * CSP notes (vercel.json cannot hold comments):
 * - script-src keeps 'unsafe-inline'. TanStack Start writes each page's router
 *   state as inline <script> tags whose text differs per page, and the
 *   prerendered pages are static files served by the CDN, so neither a
 *   per-request nonce nor a fixed list of hashes can cover them. Revisit if
 *   Start gains nonces for prerendered output or moves that state to a file.
 * - script-src-attr 'none' blocks inline event-handler attributes (onerror=,
 *   onclick=), the usual payload of injected markup. The app renders none.
 * - style-src keeps 'unsafe-inline' for React style props.
 * - grok.com and js.stripe.com stay allowed for the platform badge and checkout.
 */
import { readFileSync } from "node:fs";

/**
 * @typedef {{ source: string, headers: { key: string, value: string }[] }} HeaderRule
 * @typedef {{ source: string, destination: string, permanent?: boolean, statusCode?: number }} RedirectRule
 * @typedef {{ headers?: HeaderRule[], redirects?: RedirectRule[] }} VercelJson
 * @typedef {{ src: string, headers: Record<string, string>, continue?: boolean, status?: number }} OutputRoute
 */

/** @returns {VercelJson} */
export function readVercelJson() {
  return JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
}

/**
 * The Build Output `src` regex for a vercel.json `source`.
 * @param {string} source
 */
export function sourceToSrc(source) {
  if (source === "/(.*)") return "^/(.*)$";
  const prefix = /^\/((?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]+)\/\(\.\*\)$/.exec(source);
  if (prefix) return `^/${escapeRe(prefix[1])}/(.*)$`;
  const except = /^\/\(\(\?!((?:[A-Za-z0-9._~-]+\/)+(?:\|(?:[A-Za-z0-9._~-]+\/)+)*)\)\.\*\)$/.exec(source);
  if (except) return `^/((?!${except[1].split("|").map(escapeRe).join("|")}).*)$`;
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(source) || source.includes("//")) {
    throw new Error(`[vercel-routes] unsupported source pattern: ${source}`);
  }
  // A plain path, with or without a trailing slash, as vercel.json matches it.
  const path = source.length > 1 ? source.replace(/\/$/, "") : source;
  return `^${escapeRe(path)}${path === "/" ? "" : "/?"}$`;
}

/** @param {string} s */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build Output API v3 routes: headers first (`continue`, so later routes still run
 * and redirects carry the security headers too), then redirects.
 * @param {VercelJson} [config]
 * @returns {OutputRoute[]}
 */
export function vercelRoutes(config = readVercelJson()) {
  const headers = (config.headers ?? []).map((rule) => ({
    src: sourceToSrc(rule.source),
    headers: Object.fromEntries(rule.headers.map(({ key, value }) => [key, value])),
    continue: true,
  }));
  const redirects = (config.redirects ?? []).map((rule) => {
    if (!rule.destination.startsWith("/")) throw new Error(`[vercel-routes] off-site redirect: ${rule.source}`);
    return {
      src: sourceToSrc(rule.source),
      status: rule.statusCode ?? (rule.permanent === false ? 307 : 308),
      headers: { Location: rule.destination },
    };
  });
  return [...headers, ...redirects];
}

/** Paths under this prefix may be framed by any site. */
export const EMBED_PREFIX = "/embed/";

/**
 * The headers the given routes send for one request path: every header route that
 * matches, in order, up to the filesystem or the server route, later values winning
 * per key (compared case-insensitively, as HTTP header names are). Also counts the
 * matched routes that set a Content-Security-Policy, so a check can insist on one.
 * @param {any[]} routes
 * @param {string} path
 * @returns {{ headers: Record<string, string>, cspRoutes: number }}
 */
export function headersForPath(routes, path) {
  /** @type {Record<string, string>} */
  const headers = {};
  let cspRoutes = 0;
  for (const r of routes) {
    if (!r || r.handle === "filesystem" || (typeof r.dest === "string" && r.dest.startsWith("/__"))) break;
    if (typeof r.src !== "string" || !r.headers || r.status) continue;
    if (!new RegExp(r.src).test(path)) continue;
    for (const [k, v] of Object.entries(r.headers)) {
      const key = k.toLowerCase();
      if (key === "content-security-policy") cspRoutes += 1;
      headers[key] = String(v);
    }
  }
  return { headers, cspRoutes };
}

/**
 * The Content-Security-Policy vercel.json sends on a path: the site-wide one by
 * default, the /embed/* one for an embed path.
 * @param {VercelJson} [config]
 * @param {string} [path]
 */
export function contentSecurityPolicy(config = readVercelJson(), path = "/") {
  return headersForPath(vercelRoutes(config), path).headers["content-security-policy"] ?? "";
}

/**
 * The site CSP with frame-ancestors opened to every site: what /embed/* must send.
 * @param {string} csp
 */
export function embedCsp(csp) {
  const re = /(^|;\s*)frame-ancestors [^;]*/;
  return re.test(csp) ? csp.replace(re, "$1frame-ancestors *") : `${csp}; frame-ancestors *`;
}

/** Paths under this prefix get no CSP from vercel.json: the LTI handler sends its own. */
export const LTI_PREFIX = "/api/lti/";
