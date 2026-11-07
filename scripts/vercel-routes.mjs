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
 * Only plain paths and the catch-all "/(.*)" are supported as `source`; anything
 * else throws at build time rather than being translated wrong.
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
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(source) || source.includes("//")) {
    throw new Error(`[vercel-routes] unsupported source pattern: ${source}`);
  }
  // A plain path, with or without a trailing slash, as vercel.json matches it.
  const path = source.length > 1 ? source.replace(/\/$/, "") : source;
  return `^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${path === "/" ? "" : "/?"}$`;
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

/**
 * The Content-Security-Policy value vercel.json sends on every path.
 * @param {VercelJson} [config]
 */
export function contentSecurityPolicy(config = readVercelJson()) {
  const all = (config.headers ?? []).find((r) => r.source === "/(.*)");
  return all?.headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
}
