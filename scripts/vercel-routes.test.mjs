import assert from "node:assert/strict";
import { test } from "node:test";
import { contentSecurityPolicy, embedCsp, headersForPath, LTI_PREFIX, readVercelJson, sourceToSrc, vercelRoutes } from "./vercel-routes.mjs";
import { checkBuildConfig, PROBE_PATHS } from "./vercel-routes-check.mjs";

/** The frame-ancestors every non-embed path has always sent. */
const SITE_ANCESTORS = "frame-ancestors 'self' https://grok.com https://*.grok.com https://*.grok.me";

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
  assert.ok(csp.includes(`${SITE_ANCESTORS};`), "site frame-ancestors unchanged");
});

test("/embed/* may be framed by any site; every other path keeps the old frame-ancestors", () => {
  const site = contentSecurityPolicy();
  for (const path of ["/", "/pairs", "/pair/warfarin-fluconazole", "/pair/x/", "/embed", "/embedded/pair/x", "/x/embed/pair/y", "/api/lti", "/api/ltix/login", "/x/api/lti/login"]) {
    assert.equal(contentSecurityPolicy(undefined, path), site, path);
    assert.ok(contentSecurityPolicy(undefined, path).includes(SITE_ANCESTORS), path);
  }
  for (const path of ["/embed/pair/warfarin-fluconazole", "/embed/pair/x/", "/embed/"]) {
    const csp = contentSecurityPolicy(undefined, path);
    assert.match(csp, /(^|; )frame-ancestors \*(;|$)/, path);
    assert.equal(csp, embedCsp(site), `${path}: only frame-ancestors differs from the site CSP`);
    const { headers } = headersForPath(vercelRoutes(), path);
    assert.equal(headers["x-frame-options"], undefined, path);
  }
  // Every other header on the embed rule matches the site rule exactly.
  const [site0, embed0] = vercelRoutes();
  const strip = (/** @type {Record<string, string>} */ h) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== "Content-Security-Policy"));
  assert.deepEqual(strip(embed0.headers), strip(site0.headers));
  assert.ok(!JSON.stringify(readVercelJson()).toLowerCase().includes("x-frame-options"), "nothing sends X-Frame-Options");
  assert.equal(embedCsp("default-src 'self'"), "default-src 'self'; frame-ancestors *");
  assert.equal(embedCsp("frame-ancestors 'none'; base-uri 'self'"), "frame-ancestors *; base-uri 'self'");
});

test("every response gets the security headers before anything else routes", () => {
  const [site, embed] = vercelRoutes();
  assert.equal(site.src, "^/((?!embed/|api/lti/).*)$");
  assert.equal(embed.src, "^/embed/(.*)$");
  for (const r of [site, embed]) {
    assert.equal(r.continue, true);
    for (const key of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
      assert.ok(r.headers[key], `missing ${key}`);
    }
  }
  for (const path of ["/", "/pairs", "/pair/warfarin-fluconazole", "/sw.js", "/embed", "/embed/pair/warfarin-fluconazole", "/api/v1/check"]) {
    const { headers, cspRoutes } = headersForPath(vercelRoutes(), path);
    assert.equal(cspRoutes, 1, `${path} gets exactly one CSP`);
    for (const key of ["strict-transport-security", "x-content-type-options", "referrer-policy", "permissions-policy"]) assert.ok(headers[key], `${path} ${key}`);
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
  assert.equal(sourceToSrc("/embed/(.*)"), "^/embed/(.*)$");
  assert.equal(sourceToSrc("/((?!embed/).*)"), "^/((?!embed/).*)$");
  assert.equal(sourceToSrc("/((?!embed/|api/lti/).*)"), "^/((?!embed/|api/lti/).*)$");
  assert.equal(sourceToSrc("/api/lti/(.*)"), "^/api/lti/(.*)$");
  assert.equal(sourceToSrc("/a.b/(.*)"), "^/a\\.b/(.*)$");
  assert.throws(() => sourceToSrc("/((?!a|b).*)"));
  assert.throws(() => sourceToSrc("/((?!a/|).*)"));
  assert.throws(() => sourceToSrc("/a/(.*)/b"));
  assert.throws(() => sourceToSrc("/a//(.*)"));
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
  assert.ok(PROBE_PATHS.includes("/") && PROBE_PATHS.some((p) => p.startsWith("/embed/")) && PROBE_PATHS.some((p) => p.startsWith("/pair/")));
  // A route ahead of ours that adds X-Frame-Options or a second CSP fails the probes.
  const xfo = checkBuildConfig({ version: 3, routes: [{ src: "^/(.*)$", headers: { "X-Frame-Options": "DENY" }, continue: true }, ...vercelRoutes(), ...NITRO_TAIL] });
  assert.ok(xfo.some((p) => p.startsWith("/embed/pair/") && p.includes("X-Frame-Options")), xfo.join("; "));
  const second = checkBuildConfig({ version: 3, routes: [...vercelRoutes(), { src: "^/(.*)$", headers: { "content-security-policy": "frame-ancestors 'none'" }, continue: true }, ...NITRO_TAIL] });
  assert.ok(second.some((p) => p.includes("want exactly 1")) && second.some((p) => p.includes("embed pages need frame-ancestors *")), second.join("; "));
  // The old single catch-all (no embed rule) would leave embeds unframeable.
  const old = readVercelJson();
  const legacy = { ...old, headers: [{ ...old.headers[0], source: "/(.*)" }, ...old.headers.slice(2)] };
  const oldRoutes = vercelRoutes(legacy);
  const noEmbed = checkBuildConfig({ version: 3, routes: [...oldRoutes, ...NITRO_TAIL] }, oldRoutes);
  assert.ok(noEmbed.some((p) => p.includes("embed pages need frame-ancestors *")), noEmbed.join("; "));
  assert.deepEqual(checkBuildConfig({ routes: [] }, []), ["vercel.json sends no Content-Security-Policy"]);
});

test("/api/lti/* gets HSTS and Permissions-Policy but no CSP: the LTI handler sends its own", () => {
  const routes = vercelRoutes();
  const site = routes[0];
  for (const path of ["/api/lti/login", "/api/lti/launch", "/api/lti/deep-link", "/api/lti/jwks", "/api/lti/config", "/api/lti/"]) {
    assert.ok(path.startsWith(LTI_PREFIX));
    const { headers, cspRoutes } = headersForPath(routes, path);
    assert.equal(cspRoutes, 0, `${path} gets no CSP from vercel.json`);
    assert.equal(headers["content-security-policy"], undefined, path);
    assert.equal(headers["x-frame-options"], undefined, path);
    assert.equal(headers["strict-transport-security"], site.headers["Strict-Transport-Security"], path);
    assert.equal(headers["permissions-policy"], site.headers["Permissions-Policy"], path);
  }
  // Referrer-Policy and nosniff come from the handler (no-referrer, nosniff), so the route leaves them alone.
  const lti = routes.find((r) => r.src === "^/api/lti/(.*)$");
  assert.deepEqual(Object.keys(lti?.headers ?? {}).sort(), ["Permissions-Policy", "Strict-Transport-Security"]);
  // A built config that still put the site CSP on /api/lti/ fails the check.
  const leaky = [{ src: "^/(.*)$", headers: { "Content-Security-Policy": contentSecurityPolicy() }, continue: true }, ...routes, ...NITRO_TAIL];
  const problems = checkBuildConfig({ version: 3, routes: leaky });
  assert.ok(problems.some((p) => p.startsWith("/api/lti/") && p.includes("want none")), problems.join("; "));
});
