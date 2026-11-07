import assert from "node:assert/strict";
import { test } from "node:test";
import { contentSecurityPolicy, readVercelJson, sourceToSrc, vercelRoutes } from "./vercel-routes.mjs";
import { checkBuildConfig } from "./vercel-routes-check.mjs";

/** The tail Nitro's preset wrote on its own (the pre-fix config.json). */
const NITRO_TAIL = [
  { headers: { "cache-control": "public, max-age=31536000, immutable" }, src: "/assets/(.*)" },
  { handle: "filesystem" },
  { src: "/(.*)", dest: "/__server" },
];

test("the CSP keeps its hard limits", () => {
  const csp = contentSecurityPolicy();
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "script-src-attr 'none'", "upgrade-insecure-requests"]) {
    assert.ok(csp.includes(d), `missing ${d}`);
  }
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'self' https:\/\/grok\.com/);
});

test("every response gets the security headers before anything else routes", () => {
  const [first] = vercelRoutes();
  assert.equal(first.src, "^/(.*)$");
  assert.equal(first.continue, true);
  for (const key of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.ok(first.headers[key], `missing ${key}`);
  }
  const sw = vercelRoutes().find((r) => new RegExp(r.src).test("/sw.js") && r.headers["Service-Worker-Allowed"]);
  assert.deepEqual(sw?.headers, { "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" });
});

test("redirects match the old slug exactly, with or without a trailing slash", () => {
  const cfg = readVercelJson();
  const routes = vercelRoutes().filter((r) => r.status);
  assert.equal(routes.length, cfg.redirects.length);
  assert.ok(routes.every((r) => r.status === 308), "permanent redirects are 308");
  const tmp = routes.find((r) => r.headers.Location === "/drug/bactrim");
  const re = new RegExp(tmp.src);
  assert.ok(re.test("/drug/tmp-smx"));
  assert.ok(re.test("/drug/tmp-smx/"));
  assert.ok(!re.test("/drug/tmp-smx-extra"));
  assert.ok(!re.test("/x/drug/tmp-smx"));
});

test("sourceToSrc refuses patterns it cannot translate", () => {
  assert.equal(sourceToSrc("/"), "^/$");
  assert.equal(sourceToSrc("/sw.js"), "^/sw\\.js/?$");
  assert.throws(() => sourceToSrc("/drug/:slug"));
  assert.throws(() => sourceToSrc("/(.*).js"));
  assert.throws(() => vercelRoutes({ redirects: [{ source: "/a", destination: "https://example.com" }] }));
  assert.equal(vercelRoutes({ redirects: [{ source: "/a", destination: "/b", permanent: false }] })[0].status, 307);
});

test("checkBuildConfig accepts our routes ahead of Nitro's and rejects the old output", () => {
  assert.deepEqual(checkBuildConfig({ version: 3, routes: [...vercelRoutes(), ...NITRO_TAIL] }), []);
  const before = checkBuildConfig({ version: 3, routes: NITRO_TAIL });
  assert.equal(before.length, vercelRoutes().length, "the pre-fix config.json fails on every route");
  const late = checkBuildConfig({ version: 3, routes: [NITRO_TAIL[1], ...vercelRoutes()] });
  assert.ok(late.length > 0 && late.every((p) => p.includes("after the filesystem")));
  assert.deepEqual(checkBuildConfig({}), ["config.json has no routes array"]);
  assert.deepEqual(checkBuildConfig({ routes: [] }, []), ["vercel.json sends no Content-Security-Policy"]);
});
