// Runs public/sw.js in a vm with an in-memory Cache API and fetch, and checks what it caches.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { SW_BUILD_TOKEN, stampServiceWorker, swBuildId } from "./sw-version.mjs";

const SOURCE = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const ORIGIN = "https://fp.test";

class FakeResponse {
  constructor(body = "", { status = 200, headers = {}, type = "basic", redirected = false } = {}) {
    this.body = body;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.type = type;
    this.redirected = redirected;
    this.headers = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    this.headers.get = Map.prototype.get.bind(this.headers);
  }
  clone() {
    return new FakeResponse(this.body, {
      status: this.status,
      headers: Object.fromEntries(this.headers),
      type: this.type,
      redirected: this.redirected,
    });
  }
  async text() {
    return this.body;
  }
  static error() {
    return new FakeResponse("", { status: 0, type: "error" });
  }
}

/** Cache API subset: put replaces and moves the entry to the end, like the spec's request-response list. */
function fakeCaches() {
  const stores = new Map();
  const keyOf = (r) => new URL(typeof r === "string" ? r : r.url, ORIGIN).pathname;
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      put: async (r, res) => {
        m.delete(keyOf(r));
        m.set(keyOf(r), res);
      },
      match: async (r) => m.get(keyOf(r))?.clone(),
      keys: async () => [...m.keys()].map((p) => ({ url: ORIGIN + p })),
      delete: async (r) => m.delete(keyOf(r)),
    };
  };
  return {
    stores,
    open,
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (r) => {
      for (const m of stores.values()) if (m.has(keyOf(r))) return m.get(keyOf(r)).clone();
      return undefined;
    },
    paths: (suffix) => {
      const name = [...stores.keys()].find((k) => k.endsWith(suffix));
      return name ? [...stores.get(name).keys()] : [];
    },
  };
}

const shellHtml = '<link href="/assets/app-abc.css"><script src="/assets/main-123.js"></script>';

function boot({ version = "test1", routes = {}, caches = fakeCaches() } = {}) {
  const listeners = {};
  const fetched = [];
  const state = { offline: false };
  const site = {
    "/": shellHtml,
    "/pairs": shellHtml,
    "/enzymes": shellHtml,
    "/assets/app-abc.css": "css",
    "/assets/main-123.js": "js",
    "/sitemap.xml": "<loc>https://fp.test/drug/ketamine</loc>",
    ...routes,
  };
  const fetch = async (input) => {
    const p = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
    fetched.push(p);
    if (state.offline) throw new TypeError("offline");
    const hit = site[p];
    if (hit === undefined) return new FakeResponse("missing", { status: 404 });
    return typeof hit === "string" ? new FakeResponse(hit) : hit;
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const ctx = vm.createContext({ self, caches, fetch, URL, Response: FakeResponse, Promise, Set, Map, TypeError });
  vm.runInContext(stampServiceWorker(SOURCE, version), ctx);

  async function extendable(type, extra = {}) {
    const pending = [];
    listeners[type]({ ...extra, waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  }
  async function request(path, { mode = "navigate", method = "GET" } = {}) {
    const pending = [];
    let answer = null;
    listeners.fetch({
      request: { url: ORIGIN + path, method, mode },
      respondWith: (p) => (answer = p),
      waitUntil: (p) => pending.push(p),
    });
    const res = answer ? await answer : null;
    await Promise.all(pending);
    return res;
  }
  return {
    caches,
    fetched,
    state,
    install: () => extendable("install"),
    activate: () => extendable("activate"),
    message: (data) => extendable("message", { data }),
    request,
  };
}

describe("public/sw.js", () => {
  it("has one build token for the stamp to replace", () => {
    assert.equal(SOURCE.split(SW_BUILD_TOKEN).length, 2);
    assert.match(SOURCE, /const VERSION = "fp-offline-__FP_SW_BUILD__";/);
  });

  it("install caches only the shell pages and their hashed assets", async () => {
    const sw = boot({ routes: { "/drug/ketamine": shellHtml } });
    await sw.install();
    await sw.activate();
    assert.deepEqual(sw.caches.paths("-pages").sort(), ["/", "/enzymes", "/pairs"]);
    assert.deepEqual(sw.caches.paths("-assets").sort(), ["/assets/app-abc.css", "/assets/main-123.js"]);
    assert.ok(!sw.fetched.includes("/sitemap.xml"), "no sitemap crawl");
    assert.ok(!sw.fetched.includes("/drug/ketamine"), "no reference page before it is opened");
  });

  it("caches a reference page when it is opened and serves it offline", async () => {
    const sw = boot({ routes: { "/drug/ketamine": "<h1>Ketamine</h1>" } });
    await sw.install();
    const online = await sw.request("/drug/ketamine");
    assert.equal(await online.text(), "<h1>Ketamine</h1>");
    assert.ok(sw.caches.paths("-pages").includes("/drug/ketamine"));
    sw.state.offline = true;
    const offline = await sw.request("/drug/ketamine");
    assert.equal(await offline.text(), "<h1>Ketamine</h1>");
    const unread = await sw.request("/drug/alprazolam");
    assert.equal(unread.type, "error");
  });

  it("caches a page reported by an in-app link once, and only allow-listed pages", async () => {
    const sw = boot({ routes: { "/pair/a-b": shellHtml, "/pair/a-c": shellHtml, "/plans": "plans", "/recover": "recover" } });
    await sw.install();
    await sw.message({ type: "fp-visit", path: "/pair/a-b" });
    await sw.message({ type: "fp-visit", path: "/pair/a-b" });
    assert.equal(sw.fetched.filter((p) => p === "/pair/a-b").length, 1);
    for (const path of ["/plans", "/recover", "/api/license/recover", "/__grok/x", "https://evil.test/pair/a-c"]) {
      await sw.message({ type: "fp-visit", path });
    }
    await sw.message({ type: "other", path: "/drug/x" });
    await sw.message(null);
    assert.deepEqual(sw.caches.paths("-pages").sort(), ["/", "/enzymes", "/pair/a-b", "/pairs"]);
  });

  it("keeps the never-cache rules", async () => {
    const sw = boot({
      routes: {
        "/drug/nostore": new FakeResponse("x", { headers: { "Cache-Control": "no-store" } }),
        "/drug/private": new FakeResponse("x", { headers: { "cache-control": "private, max-age=0" } }),
        "/drug/cookie": new FakeResponse("x", { headers: { "set-cookie": "a=1" } }),
        "/drug/moved": new FakeResponse("x", { redirected: true }),
        "/drug/gone": new FakeResponse("x", { status: 500 }),
        "/drug/q": "query",
        "/plans": "plans",
      },
    });
    await sw.install();
    for (const p of ["/drug/nostore", "/drug/private", "/drug/cookie", "/drug/moved", "/drug/gone", "/drug/q?x=1"]) {
      await sw.request(p);
    }
    assert.equal(await sw.request("/plans"), null, "plans is not intercepted");
    assert.equal(await sw.request("/api/license/recover"), null, "api is not intercepted");
    assert.equal(await sw.request("/drug/q", { method: "POST" }), null, "non-GET is not intercepted");
    assert.deepEqual(sw.caches.paths("-pages").sort(), ["/", "/enzymes", "/pairs"]);
  });

  it("caps the page cache, dropping the oldest pages and never the shell", async () => {
    const routes = {};
    for (let i = 0; i < 170; i++) routes[`/pair/p${i}`] = `pair ${i}`;
    const sw = boot({ routes });
    await sw.install();
    for (let i = 0; i < 170; i++) await sw.request(`/pair/p${i}`);
    const pages = sw.caches.paths("-pages");
    assert.equal(pages.length, 150);
    for (const shell of ["/", "/pairs", "/enzymes"]) assert.ok(pages.includes(shell), shell);
    assert.ok(!pages.includes("/pair/p0"), "oldest dropped");
    assert.ok(pages.includes("/pair/p169"), "newest kept");
  });

  it("a new build version deletes old caches and re-caches the pages the reader had", async () => {
    const caches = fakeCaches();
    const routes = { "/drug/ketamine": "k", "/enzyme/cyp3a4": "e" };
    const v1 = boot({ version: "v1", routes, caches });
    await v1.install();
    await v1.activate();
    await v1.request("/drug/ketamine");
    await v1.request("/enzyme/cyp3a4");
    await caches.open("someone-elses-cache");

    const v2 = boot({ version: "v2", routes, caches });
    await v2.install();
    await v2.activate();
    const names = await caches.keys();
    assert.deepEqual(names.sort(), ["fp-offline-v2-assets", "fp-offline-v2-pages", "someone-elses-cache"]);
    assert.deepEqual(caches.paths("-pages").sort(), ["/", "/drug/ketamine", "/enzyme/cyp3a4", "/enzymes", "/pairs"]);
  });
});

describe("scripts/sw-version.mjs", () => {
  it("derives a stable id from file names and the worker source", () => {
    const a = swBuildId(["assets/a-1.js", "assets/b-2.css"], "src");
    assert.match(a, /^[0-9a-f]{12}$/);
    assert.equal(swBuildId(["assets/b-2.css", "assets/a-1.js", "assets/a-1.js"], "src"), a);
    assert.notEqual(swBuildId(["assets/a-9.js", "assets/b-2.css"], "src"), a);
    assert.notEqual(swBuildId(["assets/a-1.js", "assets/b-2.css"], "src2"), a);
  });

  it("stamps the token and refuses a worker without one", () => {
    assert.equal(stampServiceWorker(`const VERSION = "fp-offline-${SW_BUILD_TOKEN}";`, "abc123"), 'const VERSION = "fp-offline-abc123";');
    assert.throws(() => stampServiceWorker('const VERSION = "fp-offline-v1";', "abc123"), /no __FP_SW_BUILD__/);
    assert.throws(() => stampServiceWorker(SW_BUILD_TOKEN, 'x"; evil()'), /bad build id/);
  });
});
